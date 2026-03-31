
import React, { useState, useMemo } from 'react';
import * as ICONS from 'lucide-react';
import { Transaction, BankAccount, CreditCard, ClientAccount, AppMode, User } from '../types';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FinanceProps {
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  creditCards: CreditCard[];
  clientAccounts: ClientAccount[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  setCreditCards: React.Dispatch<React.SetStateAction<CreditCard[]>>;
  appMode: AppMode;
  currentUser?: User | null;
}

const Finance: React.FC<FinanceProps> = ({ 
  transactions, 
  bankAccounts, 
  creditCards, 
  clientAccounts,
  setTransactions,
  setBankAccounts,
  setCreditCards,
  appMode,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'receivables' | 'payables' | 'cards'>('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Date Filters
  const [dateRange, setDateRange] = useState<'current_month' | 'previous_month' | 'last_3_months' | 'all' | 'custom'>('current_month');
  const [customStartDate, setCustomStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    description: '',
    amount: 0,
    type: 'Receita',
    category: 'Mensalidade',
    status: 'Pendente',
    date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    payment_method: 'Boleto',
    bank_account_id: '',
    credit_card_id: '',
    client_account_id: ''
  });

  const [newBankAccount, setNewBankAccount] = useState<Partial<BankAccount>>({
    name: '',
    bank_type: 'Corrente',
    current_balance: 0,
    currency: 'BRL'
  });

  const [newCreditCard, setNewCreditCard] = useState<Partial<CreditCard>>({
    name: '',
    limit_amount: 0,
    closing_day: 1,
    due_day: 10
  });

  const filteredTransactions = useMemo(() => {
    let start = startOfMonth(new Date());
    let end = endOfMonth(new Date());

    if (dateRange === 'previous_month') {
      start = startOfMonth(subMonths(new Date(), 1));
      end = endOfMonth(subMonths(new Date(), 1));
    } else if (dateRange === 'last_3_months') {
      start = startOfMonth(subMonths(new Date(), 2));
      end = endOfMonth(new Date());
    } else if (dateRange === 'custom') {
      start = parseISO(customStartDate);
      end = parseISO(customEndDate);
    } else if (dateRange === 'all') {
      return transactions;
    }

    return transactions.filter(t => {
      const tDate = parseISO(t.date);
      return isWithinInterval(tDate, { start, end });
    });
  }, [transactions, dateRange, customStartDate, customEndDate]);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    try {
      const transactionData = {
        ...newTransaction,
        ...(currentUser?.workspace_id ? { workspace_id: currentUser.workspace_id } : {})
      };

      const { data, error } = await supabase
        .from('m4_transactions')
        .insert([transactionData])
        .select();

      if (!error && data) {
        setTransactions([...transactions, data[0]]);
        setIsModalOpen(false);
        setNewTransaction({
          description: '',
          amount: 0,
          type: 'Receita',
          category: 'Mensalidade',
          status: 'Pendente',
          date: new Date().toISOString().split('T')[0],
          due_date: new Date().toISOString().split('T')[0],
          payment_method: 'Boleto',
          bank_account_id: '',
          credit_card_id: '',
          client_account_id: ''
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('m4_bank_accounts')
        .insert([{ ...newBankAccount, workspace_id: currentUser?.workspace_id }])
        .select();

      if (!error && data) {
        setBankAccounts([...bankAccounts, data[0]]);
        setIsBankModalOpen(false);
        setNewBankAccount({ name: '', bank_type: 'Corrente', current_balance: 0, currency: 'BRL' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateCreditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('m4_credit_cards')
        .insert([{ ...newCreditCard, workspace_id: currentUser?.workspace_id }])
        .select();

      if (!error && data) {
        setCreditCards([...creditCards, data[0]]);
        setIsCardModalOpen(false);
        setNewCreditCard({ name: '', limit_amount: 0, closing_day: 1, due_day: 10 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const totalRevenue = filteredTransactions
    .filter(t => t.type === 'Receita' && (t.status === 'Pago' || t.status === 'Recebido'))
    .reduce((acc, t) => acc + Number(t.amount), 0);
  
  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'Despesa' && (t.status === 'Pago' || t.status === 'Recebido'))
    .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);

  const mrr = clientAccounts
    .filter(a => a.status === 'ativo')
    .reduce((acc, a) => acc + (Number(a.monthly_value) || 0), 0);

  const pendingReceivables = filteredTransactions
    .filter(t => t.type === 'Receita' && (t.status === 'Pendente' || t.status === 'A Receber'))
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const chartData = useMemo(() => {
    return [
      { name: 'Entradas', value: totalRevenue, color: '#10b981' },
      { name: 'Saídas', value: totalExpenses, color: '#f43f5e' }
    ];
  }, [totalRevenue, totalExpenses]);

  const dueAlerts = transactions.filter(t => 
    t.status === 'Pendente' && 
    t.due_date && 
    (isToday(parseISO(t.due_date)) || isTomorrow(parseISO(t.due_date)))
  );

  const renderOverview = () => (
    <div className="space-y-8">
      {dueAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <ICONS.AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-amber-900 uppercase tracking-tight">Vencimentos Próximos</p>
              <p className="text-xs font-bold text-amber-700">{dueAlerts.length} contas vencem hoje ou amanhã. Clique para detalhar.</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('receivables')}
            className="px-4 py-2 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all"
          >
            VER DETALHES
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Receita Total (Período)</p>
          <h3 className="text-2xl font-black text-slate-900 leading-none">R$ {totalRevenue.toLocaleString()}</h3>
          <p className="text-xs font-bold text-emerald-600 mt-3 flex items-center gap-1">▲ {filteredTransactions.filter(t => t.type === 'Receita').length} <span className="text-slate-400 font-medium">entradas</span></p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">MRR (Recorrência)</p>
          <h3 className="text-2xl font-black text-blue-600 leading-none">R$ {mrr.toLocaleString()}</h3>
          <p className="text-xs font-bold text-blue-400 mt-3 italic font-medium">Saúde da agência</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">A Receber</p>
          <h3 className="text-2xl font-black text-amber-600 leading-none">R$ {pendingReceivables.toLocaleString()}</h3>
          <p className="text-xs font-bold text-slate-400 mt-3 italic font-medium">Previsão de caixa</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Saldo em Contas</p>
          <h3 className="text-2xl font-black text-white leading-none">
            R$ {bankAccounts.reduce((acc, curr) => acc + (Number(curr.current_balance) || 0), 0).toLocaleString()}
          </h3>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo Real</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6">
            <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-6">Resultado Financeiro</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={60}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Contas Bancárias</h3>
              <button onClick={() => setIsBankModalOpen(true)} className="p-2 hover:bg-slate-50 text-blue-600 rounded-lg transition-colors"><ICONS.Plus className="w-4 h-4" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {bankAccounts.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhuma conta cadastrada</div>
              ) : (
                bankAccounts.map(account => (
                  <div key={account.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center group hover:bg-white hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                        <ICONS.Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{account.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{account.bank_type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-800">R$ {Number(account.current_balance).toLocaleString()}</p>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Sincronizado</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Últimas Movimentações</h3>
              <button onClick={() => setActiveTab('receivables')} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Ver Todas</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.slice(0, 5).map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">{t.description}</p>
                        <p className="text-[10px] text-slate-400">{format(new Date(t.date), 'dd/MM/yyyy')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">{t.category}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-black ${t.type === 'Receita' ? 'text-emerald-600' : 'text-slate-800'}`}>
                          {t.type === 'Receita' ? '+' : '-'} R$ {Math.abs(Number(t.amount)).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Cartões de Crédito</h3>
              <button onClick={() => setIsCardModalOpen(true)} className="p-2 hover:bg-slate-50 text-blue-600 rounded-lg transition-colors"><ICONS.Plus className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              {creditCards.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">Nenhum cartão</div>
              ) : (
                creditCards.map(card => (
                  <div key={card.id} className="p-4 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <ICONS.CreditCard className="w-6 h-6 text-blue-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.name}</span>
                    </div>
                    <div className="mb-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Limite Disponível</p>
                      <p className="text-xl font-black">R$ {Number(card.limit_amount).toLocaleString()}</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Vencimento</p>
                        <p className="text-xs font-bold">Dia {card.due_day}</p>
                      </div>
                      <div className="w-8 h-5 bg-slate-700/50 rounded flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-200">
            <h3 className="font-black uppercase tracking-widest text-[10px] text-blue-200 mb-4">Fluxo de Caixa (Período)</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                  <span>Entradas</span>
                  <span>R$ {totalRevenue.toLocaleString()}</span>
                </div>
                <div className="w-full bg-blue-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                  <span>Saídas</span>
                  <span>R$ {totalExpenses.toLocaleString()}</span>
                </div>
                <div className="w-full bg-blue-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-rose-400 h-full" style={{ width: `${(totalExpenses / (totalRevenue || 1)) * 100}%` }}></div>
                </div>
              </div>
            </div>
            <button className="w-full mt-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all text-[10px] font-black uppercase tracking-widest">
              Análise Detalhada
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransactions = (filterType?: 'Receita' | 'Despesa') => (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-50 flex justify-between items-center">
        <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">
          {filterType ? (filterType === 'Receita' ? 'Contas a Receber' : 'Contas a Pagar') : 'Movimentações'}
        </h3>
        <div className="flex gap-2">
          <button className="p-2 hover:bg-slate-50 text-slate-400 rounded-lg transition-colors"><ICONS.Search className="w-4 h-4" /></button>
          <button className="p-2 hover:bg-slate-50 text-slate-400 rounded-lg transition-colors"><ICONS.Filter className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions
              .filter(t => !filterType || t.type === filterType)
              .map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-800">{t.description}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">{t.payment_method || 'Não definido'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">{t.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-medium text-slate-600">{format(new Date(t.due_date || t.date), 'dd/MM/yyyy')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                      t.status === 'Pago' || t.status === 'Recebido' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-black ${t.type === 'Receita' ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {t.type === 'Receita' ? '+' : '-'} R$ {Math.abs(Number(t.amount)).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto pr-4 scrollbar-none p-8 max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
            {appMode === AppMode.EUGENCIA ? 'Minhas Finanças' : 'Gestão Financeira'}
          </h1>
          <p className="text-slate-500 text-sm">
            {appMode === AppMode.EUGENCIA 
              ? 'Controle simples do meu caixa, contas e cartões.' 
              : 'Controle total de caixa, contas e cartões da agência.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            {[
              { id: 'current_month', label: 'Mês Atual' },
              { id: 'previous_month', label: 'Mês Anterior' },
              { id: 'last_3_months', label: '3 Meses' },
              { id: 'all', label: 'Tudo' },
              { id: 'custom', label: 'Personalizado' }
            ].map(range => (
              <button
                key={range.id}
                onClick={() => setDateRange(range.id as any)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  dateRange === range.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <input 
                type="date" 
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase outline-none px-2"
              />
              <span className="text-slate-400 text-[10px] font-black">ATÉ</span>
              <input 
                type="date" 
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase outline-none px-2"
              />
            </div>
          )}

          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-200 transition-all hover:bg-blue-700 flex items-center gap-2"
          >
            <ICONS.Plus className="w-4 h-4" />
            Novo Lançamento
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-10 pb-6 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Novo Lançamento</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <ICONS.X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTransaction} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-10 py-6 space-y-6 scrollbar-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tipo</label>
                    <select 
                      value={newTransaction.type} 
                      onChange={e => setNewTransaction({...newTransaction, type: e.target.value as any})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    >
                      <option value="Receita">Receita (+)</option>
                      <option value="Despesa">Despesa (-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Valor</label>
                    <input 
                      type="number" 
                      required
                      placeholder="0,00"
                      value={newTransaction.amount === 0 ? '' : newTransaction.amount} 
                      onChange={e => setNewTransaction({...newTransaction, amount: parseFloat(e.target.value) || 0})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Descrição</label>
                  <input 
                    required
                    placeholder="Ex: Mensalidade Cliente X"
                    value={newTransaction.description} 
                    onChange={e => setNewTransaction({...newTransaction, description: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Categoria</label>
                    <select 
                      value={newTransaction.category} 
                      onChange={e => setNewTransaction({...newTransaction, category: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    >
                      <option value="Mensalidade">Mensalidade</option>
                      <option value="Serviço Avulso">Serviço Avulso</option>
                      <option value="Infraestrutura">Infraestrutura</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Salários">Salários</option>
                      <option value="Impostos">Impostos</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Status</label>
                    <select 
                      value={newTransaction.status} 
                      onChange={e => setNewTransaction({...newTransaction, status: e.target.value as any})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Pago">Pago / Recebido</option>
                      <option value="Atrasado">Atrasado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Data Vencimento</label>
                    <input 
                      type="date" 
                      value={newTransaction.due_date} 
                      onChange={e => setNewTransaction({...newTransaction, due_date: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Método de Pagamento</label>
                    <select 
                      value={newTransaction.payment_method} 
                      onChange={e => setNewTransaction({...newTransaction, payment_method: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    >
                      <option value="Boleto">Boleto</option>
                      <option value="Pix">Pix</option>
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Transferência">Transferência</option>
                      <option value="Dinheiro">Dinheiro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Conta Bancária</label>
                    <select 
                      value={newTransaction.bank_account_id} 
                      onChange={e => setNewTransaction({...newTransaction, bank_account_id: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    >
                      <option value="">Nenhuma</option>
                      {bankAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Vincular a Cliente</label>
                    <select 
                      value={newTransaction.client_account_id} 
                      onChange={e => setNewTransaction({...newTransaction, client_account_id: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    >
                      <option value="">Nenhum</option>
                      {clientAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.service_type} - {acc.id.slice(0,8)}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-10 pt-6 flex gap-4 border-t border-slate-50 dark:border-slate-800 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">CANCELAR</button>
                <button 
                  onClick={handleCreateTransaction} 
                  disabled={isSyncing}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-blue-700 shadow-xl shadow-blue-100 dark:shadow-none transition-all disabled:opacity-50"
                >
                  {isSyncing ? "SALVANDO..." : "CRIAR LANÇAMENTO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBankModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-10 pb-6 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Nova Conta</h3>
              <button onClick={() => setIsBankModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <ICONS.X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateBankAccount} className="p-10 pt-0 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Nome da Conta</label>
                <input 
                  required
                  placeholder="Ex: Itaú Principal"
                  value={newBankAccount.name}
                  onChange={e => setNewBankAccount({...newBankAccount, name: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tipo</label>
                <select 
                  value={newBankAccount.bank_type}
                  onChange={e => setNewBankAccount({...newBankAccount, bank_type: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                >
                  <option value="Corrente">Corrente</option>
                  <option value="Poupança">Poupança</option>
                  <option value="Investimento">Investimento</option>
                  <option value="Caixa">Caixa (Dinheiro)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Saldo Inicial</label>
                <input 
                  type="number"
                  required
                  placeholder="0,00"
                  value={newBankAccount.current_balance === 0 ? '' : newBankAccount.current_balance}
                  onChange={e => setNewBankAccount({...newBankAccount, current_balance: parseFloat(e.target.value) || 0})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsBankModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs">CANCELAR</button>
                <button type="submit" disabled={isSyncing} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-blue-100 dark:shadow-none transition-all disabled:opacity-50">
                  {isSyncing ? "SALVANDO..." : "CRIAR CONTA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCardModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-10 pb-6 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Novo Cartão</h3>
              <button onClick={() => setIsCardModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <ICONS.X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateCreditCard} className="p-10 pt-0 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Nome do Cartão</label>
                <input 
                  required
                  placeholder="Ex: Nubank Corporativo"
                  value={newCreditCard.name}
                  onChange={e => setNewCreditCard({...newCreditCard, name: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Limite Total</label>
                <input 
                  type="number"
                  required
                  placeholder="0,00"
                  value={newCreditCard.limit_amount === 0 ? '' : newCreditCard.limit_amount}
                  onChange={e => setNewCreditCard({...newCreditCard, limit_amount: parseFloat(e.target.value) || 0})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Dia Fechamento</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    max="31"
                    placeholder="Ex: 1"
                    value={newCreditCard.closing_day === 0 ? '' : newCreditCard.closing_day}
                    onChange={e => setNewCreditCard({...newCreditCard, closing_day: parseInt(e.target.value) || 0})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Dia Vencimento</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    max="31"
                    placeholder="Ex: 10"
                    value={newCreditCard.due_day === 0 ? '' : newCreditCard.due_day}
                    onChange={e => setNewCreditCard({...newCreditCard, due_day: parseInt(e.target.value) || 0})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsCardModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs">CANCELAR</button>
                <button type="submit" disabled={isSyncing} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-blue-100 dark:shadow-none transition-all disabled:opacity-50">
                  {isSyncing ? "SALVANDO..." : "ADICIONAR CARTÃO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
        {[
          { id: 'overview', label: 'Visão Geral', icon: <ICONS.PieChart className="w-4 h-4" /> },
          { id: 'receivables', label: 'A Receber', icon: <ICONS.ArrowDownLeft className="w-4 h-4" /> },
          { id: 'payables', label: 'A Pagar', icon: <ICONS.ArrowUpRight className="w-4 h-4" /> },
          { id: 'cards', label: 'Cartões', icon: <ICONS.CreditCard className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'receivables' && renderTransactions('Receita')}
        {activeTab === 'payables' && renderTransactions('Despesa')}
        {activeTab === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creditCards.map(card => (
              <div key={card.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-slate-900 text-white rounded-2xl">
                    <ICONS.CreditCard className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.name}</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Limite Total</p>
                    <p className="text-xl font-black text-slate-800">R$ {Number(card.limit_amount).toLocaleString()}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fechamento</p>
                      <p className="text-sm font-bold text-slate-700">Dia {card.closing_day}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vencimento</p>
                      <p className="text-sm font-bold text-slate-700">Dia {card.due_day}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Finance;
