
import React, { useState, useMemo } from 'react';
import * as ICONS from 'lucide-react';
import { Transaction, BankAccount, CreditCard, ClientAccount, AppMode, User, FinanceCategory, PaymentMethod } from '../types';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isWithinInterval, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'motion/react';

interface FinanceProps {
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  creditCards: CreditCard[];
  clientAccounts: ClientAccount[];
  financeCategories: FinanceCategory[];
  paymentMethods: PaymentMethod[];
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
  financeCategories,
  paymentMethods,
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
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // New states for transaction management
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmData, setConfirmData] = useState({
    date: new Date().toISOString().split('T')[0],
    accountId: '',
    amount: 0,
    notes: ''
  });
  const [editTransaction, setEditTransaction] = useState<Partial<Transaction> & { updateScope?: 'single' | 'future' | 'all'; recurrence?: 'fixed' | 'variable'; months?: number | 'indefinite' }>({});
  const [isUpdateScopeModalOpen, setIsUpdateScopeModalOpen] = useState(false);
  const [isDeleteScopeModalOpen, setIsDeleteScopeModalOpen] = useState(false);
  
  // Date Filters
  const [dateRange, setDateRange] = useState<'current_month' | 'previous_month' | 'last_3_months' | 'next_3_months' | 'all' | 'custom'>('current_month');
  const [customStartDate, setCustomStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const generateProjections = (start: Date, end: Date) => {
    const projections: Transaction[] = [];
    clientAccounts.filter(acc => acc.status === 'ativo').forEach(acc => {
      let current = new Date(start);
      // Ensure we start from the current month if start is in the past
      const todayStart = startOfMonth(new Date());
      if (current < todayStart) {
        current = new Date(todayStart);
      }
      
      // Limit projections to a reasonable future (e.g., 12 months)
      const maxFuture = addMonths(new Date(), 12);
      const effectiveEnd = end > maxFuture ? maxFuture : end;

      while (current <= effectiveEnd) {
        const month = current.getMonth();
        const year = current.getFullYear();
        const day = acc.due_day || 10;
        
        const projectedDate = new Date(year, month, day);
        
        if (isWithinInterval(projectedDate, { start, end })) {
          // Check if a real transaction already exists for this client and month
          const alreadyPaid = transactions.find(t => 
            t.client_account_id === acc.id && 
            t.type === 'Receita' &&
            new Date(t.date).getMonth() === month &&
            new Date(t.date).getFullYear() === year
          );

          if (!alreadyPaid) {
            projections.push({
              id: `proj-${acc.id}-${year}-${month}`,
              description: `Mensalidade - ${acc.company?.name || acc.id.slice(0,8)}`,
              amount: acc.monthly_value,
              type: 'Receita',
              category: 'Mensalidade',
              status: 'A Receber',
              date: projectedDate.toISOString(),
              due_date: projectedDate.toISOString(),
              client_account_id: acc.id,
              bank_account_id: acc.bank_account_id,
              isProjected: true,
              created_at: new Date().toISOString()
            } as Transaction);
          }
        }
        current = addMonths(current, 1);
        current.setDate(1);
      }
    });
    return projections;
  };

  const filteredTransactions = useMemo(() => {
    let start = startOfMonth(new Date());
    let end = endOfMonth(new Date());

    if (dateRange === 'previous_month') {
      start = startOfMonth(subMonths(new Date(), 1));
      end = endOfMonth(subMonths(new Date(), 1));
    } else if (dateRange === 'last_3_months') {
      start = startOfMonth(subMonths(new Date(), 2));
      end = endOfMonth(new Date());
    } else if (dateRange === 'next_3_months') {
      start = startOfMonth(new Date());
      end = endOfMonth(addMonths(new Date(), 2));
    } else if (dateRange === 'custom') {
      start = parseISO(customStartDate);
      end = parseISO(customEndDate);
    } else if (dateRange === 'all') {
      const baseTransactions = [...transactions];
      const projections = generateProjections(startOfMonth(new Date()), addMonths(new Date(), 6));
      return [...baseTransactions, ...projections].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    const baseTransactions = transactions.filter(t => {
      const tDate = parseISO(t.date);
      return isWithinInterval(tDate, { start, end });
    });

    const projections = generateProjections(start, end);
    
    return [...baseTransactions, ...projections].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, clientAccounts, dateRange, customStartDate, customEndDate]);

  const [newTransaction, setNewTransaction] = useState<Partial<Transaction> & { to_bank_account_id?: string; recurrence?: 'fixed' | 'variable'; months?: number | 'indefinite' }>({
    description: '',
    amount: 0,
    type: 'Receita',
    category: 'Mensalidade',
    status: 'Pendente',
    date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    payment_method: 'Boleto',
    bank_account_id: '',
    to_bank_account_id: '',
    credit_card_id: '',
    client_account_id: '',
    is_recurring: false,
    recurrence_type: 'monthly',
    recurrence_interval: 1,
    recurrence: 'fixed',
    months: 12
  });

  const [newBankAccount, setNewBankAccount] = useState<Partial<BankAccount>>({
    name: '',
    type: 'Corrente',
    balance: 0,
    currency: 'BRL'
  });

  const [newCreditCard, setNewCreditCard] = useState<Partial<CreditCard>>({
    name: '',
    limit_amount: 0,
    closing_day: 1,
    due_day: 10
  });

  const handleConfirmPayment = async () => {
    if (!selectedTransaction) return;
    if (!confirmData.accountId) {
      alert('Por favor, selecione uma conta de destino/origem.');
      return;
    }

    setIsSyncing(true);
    try {
      const isRevenue = selectedTransaction.type === 'Receita';
      const newStatus = isRevenue ? 'Recebido' : 'Pago';
      const amount = Number(confirmData.amount);

      // 1. Update Transaction
      const updateData: Partial<Transaction> = {
        status: newStatus,
        account_id: confirmData.accountId,
        bank_account_id: confirmData.accountId, // For backward compatibility
        paid_at: new Date(confirmData.date).toISOString(),
        paid_amount: amount,
        notes: confirmData.notes || selectedTransaction.notes,
        updated_at: new Date().toISOString()
      };

      const { data: updatedTx, error: txError } = await supabase
        .from('m4_transactions')
        .update(updateData)
        .eq('id', selectedTransaction.id)
        .select();

      if (txError) throw txError;

      // 2. Update Bank Account Balance
      const account = bankAccounts.find(a => a.id === confirmData.accountId);
      if (account) {
        const newBalance = isRevenue 
          ? Number(account.balance) + amount
          : Number(account.balance) - amount;
        
        const { error: accError } = await supabase
          .from('m4_bank_accounts')
          .update({ balance: newBalance })
          .eq('id', account.id);
          
        if (accError) throw accError;
          
        setBankAccounts(prev => prev.map(a => a.id === account.id ? { ...a, balance: newBalance } : a));
      }

      if (updatedTx) {
        setTransactions(prev => prev.map(t => t.id === selectedTransaction.id ? updatedTx[0] : t));
      }

      setIsConfirmModalOpen(false);
      setIsDetailOpen(false);
      setSelectedTransaction(null);
    } catch (err: any) {
      console.error('Erro ao confirmar pagamento:', err);
      alert('Erro ao processar: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateTransaction = async (e?: React.FormEvent, scope?: 'single' | 'future' | 'all') => {
    if (e) e.preventDefault();
    if (!selectedTransaction) return;

    // If it's recurring and no scope is provided, open the scope modal
    if (selectedTransaction.recurring_id && !scope) {
      setIsUpdateScopeModalOpen(true);
      return;
    }

    setIsSyncing(true);
    try {
      const updateData = {
        ...editTransaction,
        updated_at: new Date().toISOString()
      };

      // Remove scope from update data
      delete (updateData as any).updateScope;

      let query = supabase.from('m4_transactions').update(updateData);

      if (scope === 'all') {
        query = query.eq('recurring_id', selectedTransaction.recurring_id).neq('status', 'Pago').neq('status', 'Recebido');
      } else if (scope === 'future') {
        query = query.eq('recurring_id', selectedTransaction.recurring_id).gte('date', selectedTransaction.date);
      } else {
        query = query.eq('id', selectedTransaction.id);
      }

      const { data, error } = await query.select();

      if (error) throw error;
      if (data) {
        setTransactions(prev => {
          return prev.map(t => {
            const updated = data.find(d => d.id === t.id);
            return updated ? updated : t;
          });
        });
        setIsEditModalOpen(false);
        setIsUpdateScopeModalOpen(false);
        setIsDetailOpen(false);
        setSelectedTransaction(null);
      }
    } catch (err: any) {
      console.error('Erro ao atualizar lançamento:', err);
      alert('Erro ao atualizar: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteTransaction = async (scope?: 'single' | 'future' | 'all') => {
    if (!selectedTransaction) return;

    // If it's recurring and no scope is provided, open the scope modal
    if (selectedTransaction.recurring_id && !scope) {
      setIsDeleteScopeModalOpen(true);
      return;
    }

    setIsSyncing(true);
    try {
      // Revert balance if paid/received (only for the single transaction being deleted)
      if (selectedTransaction.status === 'Pago' || selectedTransaction.status === 'Recebido') {
        const accountId = selectedTransaction.account_id || selectedTransaction.bank_account_id;
        if (accountId) {
          const account = bankAccounts.find(a => a.id === accountId);
          if (account) {
            const amount = Number(selectedTransaction.paid_amount || selectedTransaction.amount);
            const newBalance = selectedTransaction.type === 'Receita'
              ? Number(account.balance) - amount
              : Number(account.balance) + amount;
            
            await supabase
              .from('m4_bank_accounts')
              .update({ balance: newBalance })
              .eq('id', account.id);
            
            setBankAccounts(prev => prev.map(a => a.id === account.id ? { ...a, balance: newBalance } : a));
          }
        }
      }

      // Delete from Supabase
      let query = supabase.from('m4_transactions').delete();

      if (scope === 'all') {
        query = query.eq('recurring_id', selectedTransaction.recurring_id).neq('status', 'Pago').neq('status', 'Recebido');
      } else if (scope === 'future') {
        query = query.eq('recurring_id', selectedTransaction.recurring_id).gte('date', selectedTransaction.date).neq('status', 'Pago').neq('status', 'Recebido');
      } else {
        query = query.eq('id', selectedTransaction.id);
      }

      const { error } = await query;

      if (error) throw error;

      setTransactions(prev => {
        if (scope === 'all') {
          return prev.filter(t => t.recurring_id !== selectedTransaction.recurring_id || t.status === 'Pago' || t.status === 'Recebido');
        } else if (scope === 'future') {
          return prev.filter(t => t.recurring_id !== selectedTransaction.recurring_id || t.date < selectedTransaction.date || t.status === 'Pago' || t.status === 'Recebido');
        } else {
          return prev.filter(t => t.id !== selectedTransaction.id);
        }
      });

      setIsDeleteModalOpen(false);
      setIsDeleteScopeModalOpen(false);
      setIsDetailOpen(false);
      setSelectedTransaction(null);
    } catch (err: any) {
      console.error('Erro ao excluir lançamento:', err);
      alert('Erro ao excluir: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    try {
      if (newTransaction.type === 'Transferência') {
        if (!newTransaction.bank_account_id || !newTransaction.to_bank_account_id) {
          alert("Selecione as contas de origem e destino.");
          return;
        }

        const fromAccount = bankAccounts.find(a => a.id === newTransaction.bank_account_id);
        const toAccount = bankAccounts.find(a => a.id === newTransaction.to_bank_account_id);

        if (!fromAccount || !toAccount) return;

        const description = `Transferência: ${fromAccount.name} → ${toAccount.name}`;
        const amount = Number(newTransaction.amount);

        // 1. Create Outgoing Transaction
        const outData = {
          description,
          amount,
          type: 'Despesa',
          category: 'Transferência',
          status: 'Confirmado',
          date: newTransaction.date,
          due_date: newTransaction.date,
          bank_account_id: fromAccount.id,
          workspace_id: currentUser?.workspace_id
        };

        // 2. Create Incoming Transaction
        const inData = {
          description,
          amount,
          type: 'Receita',
          category: 'Transferência',
          status: 'Confirmado',
          date: newTransaction.date,
          due_date: newTransaction.date,
          bank_account_id: toAccount.id,
          workspace_id: currentUser?.workspace_id
        };

        const { data: res, error: err } = await supabase.from('m4_transactions').insert([outData, inData]).select();
        
        if (!err && res) {
          setTransactions(prev => [...prev, ...res]);
          
          // Update Balances
          const newFromBalance = Number(fromAccount.balance) - amount;
          const newToBalance = Number(toAccount.balance) + amount;
          
          await supabase.from('m4_bank_accounts').update({ balance: newFromBalance }).eq('id', fromAccount.id);
          await supabase.from('m4_bank_accounts').update({ balance: newToBalance }).eq('id', toAccount.id);
          
          setBankAccounts(prev => prev.map(a => {
            if (a.id === fromAccount.id) return { ...a, balance: newFromBalance };
            if (a.id === toAccount.id) return { ...a, balance: newToBalance };
            return a;
          }));
        }
      } else {
        const transactionsToCreate: any[] = [];
        const isRecurring = newTransaction.is_recurring;
        const recurringId = isRecurring ? crypto.randomUUID() : null;
        const numMonths = newTransaction.months === 'indefinite' ? 24 : (newTransaction.months || 1);

        const baseDate = new Date(newTransaction.date || new Date());
        const baseDueDate = new Date(newTransaction.due_date || new Date());

        for (let i = 0; i < (isRecurring ? numMonths : 1); i++) {
          const currentDate = new Date(baseDate);
          if (newTransaction.recurrence_type === 'monthly') {
            currentDate.setMonth(baseDate.getMonth() + (i * (newTransaction.recurrence_interval || 1)));
          } else if (newTransaction.recurrence_type === 'weekly') {
            currentDate.setDate(baseDate.getDate() + (i * 7 * (newTransaction.recurrence_interval || 1)));
          } else if (newTransaction.recurrence_type === 'yearly') {
            currentDate.setFullYear(baseDate.getFullYear() + (i * (newTransaction.recurrence_interval || 1)));
          }
          
          const currentDueDate = new Date(baseDueDate);
          if (newTransaction.recurrence_type === 'monthly') {
            currentDueDate.setMonth(baseDueDate.getMonth() + (i * (newTransaction.recurrence_interval || 1)));
          } else if (newTransaction.recurrence_type === 'weekly') {
            currentDueDate.setDate(baseDueDate.getDate() + (i * 7 * (newTransaction.recurrence_interval || 1)));
          } else if (newTransaction.recurrence_type === 'yearly') {
            currentDueDate.setFullYear(baseDueDate.getFullYear() + (i * (newTransaction.recurrence_interval || 1)));
          }

          const amount = (i > 0 && newTransaction.recurrence === 'variable') ? 0 : Number(newTransaction.amount);
          const status = i > 0 ? 'Pendente' : newTransaction.status;

          transactionsToCreate.push({
            description: newTransaction.description,
            amount: amount,
            type: newTransaction.type,
            category: newTransaction.category,
            status: status,
            date: currentDate.toISOString().split('T')[0],
            due_date: currentDueDate.toISOString().split('T')[0],
            payment_method: newTransaction.payment_method,
            bank_account_id: newTransaction.bank_account_id || null,
            client_account_id: newTransaction.client_account_id || null,
            notes: newTransaction.notes,
            workspace_id: currentUser?.workspace_id,
            recurring_id: recurringId,
            is_recurring: isRecurring,
            recurrence_type: isRecurring ? newTransaction.recurrence_type : null,
            recurrence: isRecurring ? newTransaction.recurrence : null,
            recurrence_interval: isRecurring ? newTransaction.recurrence_interval : null,
            recurrence_end_date: isRecurring ? newTransaction.recurrence_end_date : null
          });
        }

        const { data, error } = await supabase
          .from('m4_transactions')
          .insert(transactionsToCreate)
          .select();

        if (!error && data) {
          setTransactions(prev => [...prev, ...data]);
          
          // Update bank account balance if first transaction is paid
          const firstTransaction = data[0];
          if (firstTransaction.bank_account_id && (firstTransaction.status === 'Pago' || firstTransaction.status === 'Recebido')) {
            const account = bankAccounts.find(a => a.id === firstTransaction.bank_account_id);
            if (account) {
              const newBalance = firstTransaction.type === 'Receita' 
                ? Number(account.balance) + Number(firstTransaction.amount)
                : Number(account.balance) - Number(firstTransaction.amount);
              
              await supabase.from('m4_bank_accounts').update({ balance: newBalance }).eq('id', account.id);
              setBankAccounts(prev => prev.map(a => a.id === account.id ? { ...a, balance: newBalance } : a));
            }
          }
        } else if (error) {
          throw error;
        }
      }

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
          to_bank_account_id: '',
          credit_card_id: '',
          client_account_id: '',
          is_recurring: false,
          recurrence_type: 'monthly',
          recurrence_interval: 1,
          recurrence: 'fixed',
          months: 12
        });
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
        setNewBankAccount({ name: '', type: 'Corrente', balance: 0, currency: 'BRL' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('m4_bank_accounts')
        .update({
          name: selectedAccount.name,
          type: selectedAccount.type,
          balance: selectedAccount.balance,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAccount.id)
        .select();

      if (!error && data) {
        setBankAccounts(prev => prev.map(acc => acc.id === selectedAccount.id ? data[0] : acc));
        setSelectedAccount(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteBankAccount = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta? Todas as transações vinculadas perderão a referência.')) return;
    setIsSyncing(true);
    try {
      const { error } = await supabase
        .from('m4_bank_accounts')
        .delete()
        .eq('id', id);

      if (!error) {
        setBankAccounts(prev => prev.filter(acc => acc.id !== id));
        setSelectedAccount(null);
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
            R$ {bankAccounts.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0).toLocaleString()}
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
                  <div 
                    key={account.id} 
                    onClick={() => setSelectedAccount(account)}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center group hover:bg-white hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                        <ICONS.Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{account.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{account.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-800">R$ {Number(account.balance).toLocaleString()}</p>
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
                        <div className="flex items-center gap-2">
                          {t.category === 'Transferência' && <ICONS.ArrowLeftRight className="w-3 h-3 text-blue-500" />}
                          <p className="text-sm font-bold text-slate-800">{t.description}</p>
                        </div>
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
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTransactions
              .filter(t => !filterType || t.type === filterType)
              .map(t => (
                <tr 
                  key={t.id || `proj-${t.client_account_id}-${t.date}`} 
                  className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${t.isProjected ? 'bg-slate-50/30 italic' : ''}`}
                  onClick={() => {
                    setSelectedTransaction(t);
                    setIsDetailOpen(true);
                  }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {t.isProjected && <ICONS.Calendar className="w-3 h-3 text-blue-400" />}
                      {t.category === 'Transferência' && <ICONS.ArrowLeftRight className="w-3 h-3 text-blue-500" />}
                      {t.recurring_id && <ICONS.Repeat className="w-3 h-3 text-indigo-500" />}
                      <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{t.description}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                      {t.isProjected ? 'Projeção Automática' : (t.payment_method || 'Não definido')}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">{t.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-medium text-slate-600">{format(new Date(t.due_date || t.date), 'dd/MM/yyyy')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                      t.status === 'Pago' || t.status === 'Recebido' || t.status === 'Confirmado'
                        ? 'bg-emerald-100 text-emerald-700' 
                        : t.isProjected 
                          ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      {t.isProjected ? 'Projetado' : t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-black ${t.type === 'Receita' ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {t.type === 'Receita' ? '+' : '-'} R$ {Math.abs(Number(t.amount)).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {t.status !== 'Pago' && t.status !== 'Recebido' ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTransaction(t);
                          setConfirmData({
                            date: new Date().toISOString().split('T')[0],
                            accountId: t.account_id || t.bank_account_id || '',
                            amount: t.amount,
                            notes: ''
                          });
                          setIsConfirmModalOpen(true);
                        }}
                        disabled={isSyncing}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-lg shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-50"
                      >
                        {t.type === 'Receita' ? 'Receber' : 'Pagar'}
                      </button>
                    ) : (
                      <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                        <ICONS.MoreVertical className="w-4 h-4" />
                      </button>
                    )}
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
              { id: 'next_3_months', label: 'Próximos 3 Meses' },
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

      {/* Transaction Detail Drawer/Modal */}
      {isDetailOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex justify-end">
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-800">Detalhes do Lançamento</h3>
              <button onClick={() => setIsDetailOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ICONS.X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedTransaction.type === 'Receita' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {selectedTransaction.type === 'Receita' ? <ICONS.ArrowUpRight className="w-6 h-6" /> : <ICONS.ArrowDownRight className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-800">
                    R$ {Number(selectedTransaction.amount).toLocaleString()}
                  </p>
                  <p className="text-sm font-medium text-slate-500">{selectedTransaction.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedTransaction.status === 'Pago' || selectedTransaction.status === 'Recebido' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : selectedTransaction.status === 'Atrasado'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedTransaction.status}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Categoria</p>
                  <p className="text-sm font-bold text-slate-700">{selectedTransaction.category}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Vencimento</p>
                  <p className="text-sm font-bold text-slate-700">{format(parseISO(selectedTransaction.due_date || selectedTransaction.date), 'dd/MM/yyyy')}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Conta</p>
                  <p className="text-sm font-bold text-slate-700">
                    {bankAccounts.find(a => a.id === (selectedTransaction.account_id || selectedTransaction.bank_account_id))?.name || 'Não definida'}
                  </p>
                </div>
              </div>

              {selectedTransaction.notes && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Observações</p>
                  <p className="text-sm text-slate-600 italic">"{selectedTransaction.notes}"</p>
                </div>
              )}

              {selectedTransaction.recurring_id && (
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 flex items-center gap-3">
                  <ICONS.Repeat className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="text-xs text-indigo-700 font-bold uppercase tracking-tight">Lançamento Recorrente</p>
                    <p className="text-[10px] text-indigo-600">Este lançamento faz parte de uma série mensal ({selectedTransaction.recurrence === 'fixed' ? 'Valor Fixo' : 'Valor Variável'}).</p>
                  </div>
                </div>
              )}

              {selectedTransaction.isProjected && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-3">
                  <ICONS.Calendar className="w-5 h-5 text-blue-600" />
                  <p className="text-xs text-blue-700 font-medium">Este é um lançamento projetado automaticamente.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 grid grid-cols-3 gap-3">
              <button 
                onClick={() => {
                  setEditTransaction(selectedTransaction);
                  setIsEditModalOpen(true);
                }}
                className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-all group"
              >
                <ICONS.Edit2 className="w-5 h-5 mb-1 text-slate-400 group-hover:text-blue-600" />
                <span className="text-[10px] font-bold uppercase">Editar</span>
              </button>
              <button 
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl hover:border-rose-300 hover:text-rose-600 transition-all group"
              >
                <ICONS.Trash2 className="w-5 h-5 mb-1 text-slate-400 group-hover:text-rose-600" />
                <span className="text-[10px] font-bold uppercase">Excluir</span>
              </button>
              {(selectedTransaction.status !== 'Pago' && selectedTransaction.status !== 'Recebido') && (
                <button 
                  onClick={() => {
                    setConfirmData({
                      date: new Date().toISOString().split('T')[0],
                      accountId: selectedTransaction.account_id || selectedTransaction.bank_account_id || '',
                      amount: selectedTransaction.amount,
                      notes: ''
                    });
                    setIsConfirmModalOpen(true);
                  }}
                  className="flex flex-col items-center justify-center p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  <ICONS.CheckCircle2 className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold uppercase">Quitar</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Update Scope Modal */}
      {isUpdateScopeModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-8 pb-4 text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ICONS.Repeat size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase">Onde aplicar esta alteração?</h3>
              <p className="text-sm text-slate-500 mt-2">Este lançamento faz parte de uma recorrência.</p>
            </div>

            <div className="p-8 pt-4 space-y-3">
              <button
                onClick={() => handleUpdateTransaction(undefined, 'single')}
                className="w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-left transition-all group"
              >
                <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 uppercase tracking-tight">Apenas este mês</p>
                <p className="text-[10px] text-slate-500">Altera somente o registro atual.</p>
              </button>
              <button
                onClick={() => handleUpdateTransaction(undefined, 'future')}
                className="w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-left transition-all group"
              >
                <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 uppercase tracking-tight">Este e os próximos</p>
                <p className="text-[10px] text-slate-500">Altera o atual e todos os futuros vinculados.</p>
              </button>
              <button
                onClick={() => handleUpdateTransaction(undefined, 'all')}
                className="w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-left transition-all group"
              >
                <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 uppercase tracking-tight">Todos (inclusive passados)</p>
                <p className="text-[10px] text-slate-500">Altera todo o histórico (exceto os já quitados).</p>
              </button>
              
              <button
                onClick={() => setIsUpdateScopeModalOpen(false)}
                className="w-full p-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-all"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {isConfirmModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-black text-slate-800">
                Confirmar {selectedTransaction.type === 'Receita' ? 'Recebimento' : 'Pagamento'}
              </h3>
              <button onClick={() => setIsConfirmModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <ICONS.X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-600 uppercase mb-1">Lançamento</p>
                <p className="text-sm font-bold text-slate-800">{selectedTransaction.description}</p>
                <p className="text-xl font-black text-blue-700 mt-1">R$ {Number(selectedTransaction.amount).toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data Efetiva</label>
                  <input 
                    type="date"
                    value={confirmData.date}
                    onChange={e => setConfirmData({...confirmData, date: e.target.value})}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Valor Efetivo</label>
                  <input 
                    type="number"
                    value={confirmData.amount}
                    onChange={e => setConfirmData({...confirmData, amount: parseFloat(e.target.value) || 0})}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Conta de Destino/Origem</label>
                {bankAccounts.length > 0 ? (
                  <select 
                    value={confirmData.accountId}
                    onChange={e => setConfirmData({...confirmData, accountId: e.target.value})}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">Selecione uma conta...</option>
                    {bankAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} (Saldo: R$ {acc.balance.toLocaleString()})</option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg">
                    <p className="text-xs text-rose-700 font-medium">Nenhuma conta bancária cadastrada.</p>
                    <button className="text-xs text-rose-800 font-bold underline mt-1">Cadastrar conta agora</button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observações (Opcional)</label>
                <textarea 
                  value={confirmData.notes}
                  onChange={e => setConfirmData({...confirmData, notes: e.target.value})}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm h-20 resize-none"
                  placeholder="Alguma nota sobre este pagamento?"
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmPayment}
                disabled={isSyncing || !confirmData.accountId}
                className="flex-1 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncing ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Scope Modal */}
      {isDeleteScopeModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-8 pb-4 text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ICONS.Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase">Onde aplicar esta exclusão?</h3>
              <p className="text-sm text-slate-500 mt-2">Este lançamento faz parte de uma recorrência.</p>
            </div>

            <div className="p-8 pt-4 space-y-3">
              <button
                onClick={() => handleDeleteTransaction('single')}
                className="w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-left transition-all group"
              >
                <p className="text-sm font-black text-slate-900 group-hover:text-rose-600 uppercase tracking-tight">Apenas este mês</p>
                <p className="text-[10px] text-slate-500">Exclui somente o registro atual.</p>
              </button>
              <button
                onClick={() => handleDeleteTransaction('future')}
                className="w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-left transition-all group"
              >
                <p className="text-sm font-black text-slate-900 group-hover:text-rose-600 uppercase tracking-tight">Este e os próximos</p>
                <p className="text-[10px] text-slate-500">Exclui o atual e todos os futuros vinculados.</p>
              </button>
              <button
                onClick={() => handleDeleteTransaction('all')}
                className="w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-left transition-all group"
              >
                <p className="text-sm font-black text-slate-900 group-hover:text-rose-600 uppercase tracking-tight">Todos (inclusive passados)</p>
                <p className="text-[10px] text-slate-500">Exclui todo o histórico (exceto os já quitados).</p>
              </button>
              
              <button
                onClick={() => setIsDeleteScopeModalOpen(false)}
                className="w-full p-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-all"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {isDeleteModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ICONS.AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Excluir Lançamento?</h3>
              <p className="text-sm text-slate-500 mb-6">
                Esta ação não pode ser desfeita. 
                {(selectedTransaction.status === 'Pago' || selectedTransaction.status === 'Recebido') && (
                  <span className="block mt-2 font-bold text-rose-600">
                    Atenção: O saldo da conta vinculada será estornado automaticamente.
                  </span>
                )}
              </p>

              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => handleDeleteTransaction()}
                  disabled={isSyncing}
                  className="w-full py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all"
                >
                  {isSyncing ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="w-full py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {isEditModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-10 pb-6 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Editar Lançamento</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <ICONS.X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateTransaction} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-10 py-6 space-y-6 scrollbar-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tipo</label>
                    <select 
                      value={editTransaction.type} 
                      onChange={e => setEditTransaction({...editTransaction, type: e.target.value as any})}
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
                      value={editTransaction.amount} 
                      onChange={e => setEditTransaction({...editTransaction, amount: parseFloat(e.target.value) || 0})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Descrição</label>
                  <input 
                    required
                    value={editTransaction.description} 
                    onChange={e => setEditTransaction({...editTransaction, description: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Categoria</label>
                    <select 
                      value={editTransaction.category} 
                      onChange={e => setEditTransaction({...editTransaction, category: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    >
                      {financeCategories
                        .filter(c => c.type === editTransaction.type)
                        .map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Data Vencimento</label>
                    <input 
                      type="date" 
                      value={editTransaction.due_date?.split('T')[0]} 
                      onChange={e => setEditTransaction({...editTransaction, due_date: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
                        <ICONS.Repeat size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Recorrência</h4>
                        <p className="text-[10px] text-slate-500 font-medium">Configurar lançamento repetido</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditTransaction({...editTransaction, is_recurring: !editTransaction.is_recurring})}
                      className={`w-12 h-6 rounded-full transition-all relative ${editTransaction.is_recurring ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${editTransaction.is_recurring ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  {editTransaction.is_recurring && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Frequência</label>
                          <select 
                            value={editTransaction.recurrence_type}
                            onChange={e => setEditTransaction({...editTransaction, recurrence_type: e.target.value as any})}
                            className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                          >
                            <option value="weekly">Semanal</option>
                            <option value="monthly">Mensal</option>
                            <option value="yearly">Anual</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Intervalo (cada X)</label>
                          <input 
                            type="number"
                            min="1"
                            value={editTransaction.recurrence_interval}
                            onChange={e => setEditTransaction({...editTransaction, recurrence_interval: parseInt(e.target.value) || 1})}
                            className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tipo de Valor</label>
                          <select 
                            value={editTransaction.recurrence}
                            onChange={e => setEditTransaction({...editTransaction, recurrence: e.target.value as any})}
                            className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                          >
                            <option value="fixed">Valor Fixo</option>
                            <option value="variable">Valor Variável</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Data Fim (Opcional)</label>
                          <input 
                            type="date"
                            value={editTransaction.recurrence_end_date || ''}
                            onChange={e => setEditTransaction({...editTransaction, recurrence_end_date: e.target.value})}
                            className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Observações</label>
                  <textarea 
                    value={editTransaction.notes || ''} 
                    onChange={e => setEditTransaction({...editTransaction, notes: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white h-24 resize-none"
                  />
                </div>
              </div>

              <div className="p-10 pt-6 flex gap-4 border-t border-slate-50 dark:border-slate-800 shrink-0">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">CANCELAR</button>
                <button 
                  type="submit"
                  disabled={isSyncing}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-blue-700 shadow-xl shadow-blue-100 dark:shadow-none transition-all disabled:opacity-50"
                >
                  {isSyncing ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                      <option value="Transferência">Transferência (⇄)</option>
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

                {newTransaction.type !== 'Transferência' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Categoria</label>
                      <select 
                        value={newTransaction.category} 
                        onChange={e => setNewTransaction({...newTransaction, category: e.target.value})}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                      >
                        <option value="">Selecione...</option>
                        {financeCategories
                          .filter(c => c.type === newTransaction.type)
                          .map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        {financeCategories.length === 0 && (
                          <>
                            <option value="Mensalidade">Mensalidade</option>
                            <option value="Serviço Avulso">Serviço Avulso</option>
                            <option value="Infraestrutura">Infraestrutura</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Salários">Salários</option>
                            <option value="Impostos">Impostos</option>
                            <option value="Outros">Outros</option>
                          </>
                        )}
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
                )}

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
                      <option value="">Selecione...</option>
                      {paymentMethods.map(m => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                      {paymentMethods.length === 0 && (
                        <>
                          <option value="Boleto">Boleto</option>
                          <option value="Pix">Pix</option>
                          <option value="Cartão de Crédito">Cartão de Crédito</option>
                          <option value="Transferência">Transferência</option>
                          <option value="Dinheiro">Dinheiro</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                      {newTransaction.type === 'Transferência' ? 'Sair da Conta' : 'Conta Bancária'}
                    </label>
                    <select 
                      value={newTransaction.bank_account_id} 
                      onChange={e => setNewTransaction({...newTransaction, bank_account_id: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    >
                      <option value="">Nenhuma</option>
                      {bankAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                  </div>
                  {newTransaction.type === 'Transferência' ? (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Entrar na Conta</label>
                      <select 
                        required
                        value={newTransaction.to_bank_account_id} 
                        onChange={e => setNewTransaction({...newTransaction, to_bank_account_id: e.target.value})}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                      >
                        <option value="">Selecione a conta...</option>
                        {bankAccounts
                          .filter(acc => acc.id !== newTransaction.bank_account_id)
                          .map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Vincular a Cliente</label>
                      <select 
                        value={newTransaction.client_account_id} 
                        onChange={e => setNewTransaction({...newTransaction, client_account_id: e.target.value})}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                      >
                        <option value="">Nenhum</option>
                        {clientAccounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.company?.name || acc.service_type} - {acc.id.slice(0,8)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
                        <ICONS.Repeat size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Recorrência</h4>
                        <p className="text-[10px] text-slate-500 font-medium">Configurar lançamento repetido</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewTransaction({...newTransaction, is_recurring: !newTransaction.is_recurring})}
                      className={`w-12 h-6 rounded-full transition-all relative ${newTransaction.is_recurring ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newTransaction.is_recurring ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  {newTransaction.is_recurring && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Frequência</label>
                          <select 
                            value={newTransaction.recurrence_type}
                            onChange={e => setNewTransaction({...newTransaction, recurrence_type: e.target.value as any})}
                            className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                          >
                            <option value="weekly">Semanal</option>
                            <option value="monthly">Mensal</option>
                            <option value="yearly">Anual</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Intervalo (cada X)</label>
                          <input 
                            type="number"
                            min="1"
                            value={newTransaction.recurrence_interval}
                            onChange={e => setNewTransaction({...newTransaction, recurrence_interval: parseInt(e.target.value) || 1})}
                            className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tipo de Valor</label>
                          <select 
                            value={newTransaction.recurrence}
                            onChange={e => setNewTransaction({...newTransaction, recurrence: e.target.value as any})}
                            className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                          >
                            <option value="fixed">Valor Fixo</option>
                            <option value="variable">Valor Variável</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Duração (Meses)</label>
                          <select 
                            value={newTransaction.months}
                            onChange={e => setNewTransaction({...newTransaction, months: e.target.value === 'indefinite' ? 'indefinite' : parseInt(e.target.value)})}
                            className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                          >
                            <option value={12}>12 Meses</option>
                            <option value={24}>24 Meses</option>
                            <option value={36}>36 Meses</option>
                            <option value="indefinite">Indeterminado</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Observações</label>
                  <textarea 
                    placeholder="Notas adicionais..."
                    value={newTransaction.notes || ''} 
                    onChange={e => setNewTransaction({...newTransaction, notes: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white h-24 resize-none"
                  />
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
                  value={newBankAccount.type}
                  onChange={e => setNewBankAccount({...newBankAccount, type: e.target.value})}
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
                  value={newBankAccount.balance === 0 ? '' : newBankAccount.balance}
                  onChange={e => setNewBankAccount({...newBankAccount, balance: parseFloat(e.target.value) || 0})}
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

      {selectedAccount && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-10 pb-6 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Detalhes da Conta</h3>
              <button onClick={() => setSelectedAccount(null)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <ICONS.X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-10 py-6 space-y-8 scrollbar-none">
              <form onSubmit={handleUpdateBankAccount} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Nome da Conta</label>
                    <input 
                      required
                      value={selectedAccount.name}
                      onChange={e => setSelectedAccount({...selectedAccount, name: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tipo</label>
                    <select 
                      value={selectedAccount.type}
                      onChange={e => setSelectedAccount({...selectedAccount, type: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    >
                      <option value="Corrente">Corrente</option>
                      <option value="Poupança">Poupança</option>
                      <option value="Investimento">Investimento</option>
                      <option value="Caixa">Caixa (Dinheiro)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Saldo Atual</label>
                  <input 
                    type="number"
                    required
                    value={selectedAccount.balance}
                    onChange={e => setSelectedAccount({...selectedAccount, balance: parseFloat(e.target.value) || 0})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => handleDeleteBankAccount(selectedAccount.id)}
                    className="px-6 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase text-xs hover:bg-rose-100 transition-all"
                  >
                    EXCLUIR CONTA
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSyncing}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all disabled:opacity-50"
                  >
                    {isSyncing ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">Histórico Recente</h4>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {transactions
                        .filter(t => t.bank_account_id === selectedAccount.id)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 10)
                        .map(t => (
                          <tr key={t.id} className="text-xs">
                            <td className="px-6 py-4 font-bold text-slate-500">{format(new Date(t.date), 'dd/MM/yyyy')}</td>
                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{t.description}</td>
                            <td className={`px-6 py-4 text-right font-black ${t.type === 'Receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {t.type === 'Receita' ? '+' : '-'} R$ {Math.abs(Number(t.amount)).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      {transactions.filter(t => t.bank_account_id === selectedAccount.id).length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nenhuma transação encontrada</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
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
