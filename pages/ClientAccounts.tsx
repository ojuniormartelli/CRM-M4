import React, { useState, useEffect } from 'react';
import * as ICONS from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ClientAccount, Lead, Task, Transaction, Interaction, Company, Service } from '../types';
import { format, addMonths, setDate, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientAccountsProps {
  leads: Lead[];
  tasks: Task[];
  transactions: Transaction[];
  clientAccounts: ClientAccount[];
  setClientAccounts: React.Dispatch<React.SetStateAction<ClientAccount[]>>;
  companies: Company[];
  services: Service[];
}

export default function ClientAccounts({ leads, tasks, transactions, clientAccounts, setClientAccounts, companies, services }: ClientAccountsProps) {
  const [selectedAccount, setSelectedAccount] = useState<ClientAccount | null>(null);
  const [view, setView] = useState<'list' | 'details'>('list');
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newAccountData, setNewAccountData] = useState<Partial<ClientAccount>>({
    company_id: '',
    service_name: '',
    service_type: 'Gestão de Tráfego',
    monthly_value: 0,
    due_day: 10,
    status: 'ativo',
    billing_model: 'recorrente',
    start_date: new Date().toISOString().split('T')[0]
  });

  const getCompanyName = (companyId: string) => {
    return companies.find(c => c.id === companyId)?.name || 'Empresa Desconhecida';
  };

  const getAccountStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400';
      case 'pausado': return 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400';
      case 'cancelado': return 'bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400';
    }
  };

  const getNextDueDate = (dueDay: number) => {
    const today = new Date();
    let dueDate = setDate(today, dueDay);
    
    if (isBefore(dueDate, today)) {
      dueDate = addMonths(dueDate, 1);
    }
    
    return dueDate;
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountData.company_id) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('m4_client_accounts')
        .insert([{
          ...newAccountData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      if (data) {
        setClientAccounts([...clientAccounts, data[0]]);
        setIsNewAccountModalOpen(false);
        setNewAccountData({
          company_id: '',
          service_name: '',
          service_type: 'Gestão de Tráfego',
          monthly_value: 0,
          due_day: 10,
          status: 'ativo',
          billing_model: 'recorrente',
          start_date: new Date().toISOString().split('T')[0]
        });
      }
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      alert('Erro ao criar conta. Verifique os campos e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const getAccountHistory = (leadId?: string, companyId?: string) => {
    const leadTasks = tasks.filter(t => (leadId && t.lead_id === leadId) || (companyId && t.company_id === companyId)).map(t => ({
      type: 'Tarefa',
      title: t.title,
      date: t.due_date || t.created_at,
      status: t.status,
      icon: <ICONS.CheckCircle className="w-4 h-4" />
    }));

    const leadTransactions = transactions.filter(t => (leadId && t.lead_id === leadId) || (companyId && t.company_id === companyId)).map(t => ({
      type: 'Financeiro',
      title: `${t.type}: ${t.description}`,
      date: t.date,
      status: t.status,
      icon: <ICONS.DollarSign className="w-4 h-4" />
    }));

    const lead = leads.find(l => l.id === leadId);
    const leadInteractions = (lead?.interactions || []).map(i => ({
      type: 'Interação',
      title: i.note,
      date: i.created_at,
      status: i.type,
      icon: <ICONS.MessageSquare className="w-4 h-4" />
    }));

    return [...leadTasks, ...leadTransactions, ...leadInteractions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  if (!clientAccounts) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pr-4 scrollbar-none p-8 max-w-7xl mx-auto">
      {view === 'list' ? (
        <>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Contas Ativas</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Acompanhamento e gestão de contas em dia.</p>
            </div>
            <button 
              onClick={() => setIsNewAccountModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
            >
              <ICONS.Plus className="w-4 h-4" />
              Nova Conta
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <ICONS.Users className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contas Ativas</span>
              </div>
              <p className="text-3xl font-black text-slate-800 dark:text-white">{clientAccounts.filter(a => a.status === 'ativo').length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                  <ICONS.TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">MRR Total</span>
              </div>
              <p className="text-3xl font-black text-slate-800 dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  clientAccounts.filter(a => a.status === 'ativo').reduce((acc, curr) => acc + (Number(curr.monthly_value) || 0), 0)
                )}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg">
                  <ICONS.AlertCircle className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Acompanhamento</span>
              </div>
              <p className="text-3xl font-black text-slate-800 dark:text-white">Em dia</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Serviço</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Mensal</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Próx. Vencimento</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {clientAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      Nenhum cliente ativo encontrado.
                    </td>
                  </tr>
                ) : (
                  clientAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 dark:text-white">{getCompanyName(account.company_id)}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Desde {format(new Date(account.start_date), 'dd/MM/yyyy')}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{account.service_name || account.service_type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${getAccountStatusColor(account.status)}`}>
                          {account.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.monthly_value)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {account.due_day ? format(getNextDueDate(account.due_day), 'dd/MM/yyyy') : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => { setSelectedAccount(account); setView('details'); }}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-all"
                        >
                          <ICONS.Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        selectedAccount && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button 
              onClick={() => setView('list')}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-800 dark:hover:text-white mb-6 transition-colors group"
            >
              <ICONS.ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-widest">Voltar para lista</span>
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-1">{getCompanyName(selectedAccount.company_id)}</h2>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${getAccountStatusColor(selectedAccount.status)}`}>
                          {selectedAccount.status}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">{selectedAccount.service_name || selectedAccount.service_type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Valor Mensal</p>
                      <p className="text-2xl font-black text-blue-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedAccount.monthly_value)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-slate-50 dark:border-slate-800">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Início</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{format(new Date(selectedAccount.start_date), 'dd/MM/yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Modelo</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">{selectedAccount.billing_model}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Próximo Vencimento</p>
                      <p className="text-sm font-bold text-emerald-600">
                        {selectedAccount.due_day ? format(getNextDueDate(selectedAccount.due_day), 'dd/MM/yyyy') : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Saúde</p>
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full w-[85%]"></div>
                        </div>
                        <span className="text-[10px] font-black text-emerald-600">85%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs">Histórico Unificado</h3>
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg transition-colors"><ICONS.Filter className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-slate-100 dark:before:bg-slate-800">
                      {getAccountHistory(selectedAccount.lead_id, selectedAccount.company_id).map((item, i) => (
                        <div key={i} className="flex gap-6 relative">
                          <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 z-10 shadow-sm">
                            {item.icon}
                          </div>
                          <div className="flex-1 pb-6 border-b border-slate-50 dark:border-slate-800 last:border-0">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="text-sm font-bold text-slate-800 dark:text-white">{item.title}</h4>
                              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{format(new Date(item.date), 'dd MMM, yyyy', { locale: ptBR })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{item.type}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{item.status}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs mb-6">Ações Rápidas</h3>
                  <div className="space-y-3">
                    <button className="w-full flex items-center gap-3 p-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none">
                      <ICONS.Plus className="w-4 h-4" />
                      <span className="text-xs font-bold">Nova Tarefa</span>
                    </button>
                    <button className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                      <ICONS.DollarSign className="w-4 h-4" />
                      <span className="text-xs font-bold">Lançar Recebimento</span>
                    </button>
                    <button className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                      <ICONS.FileText className="w-4 h-4" />
                      <span className="text-xs font-bold">Gerar Relatório</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900 dark:bg-slate-800 p-6 rounded-3xl text-white shadow-xl shadow-slate-200 dark:shadow-none">
                  <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 dark:text-slate-500 mb-4">Notas da Conta</h3>
                  <p className="text-sm text-slate-300 dark:text-slate-400 leading-relaxed italic">
                    "{selectedAccount.notes || 'Nenhuma nota registrada para este cliente.'}"
                  </p>
                  <button className="mt-4 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors">
                    Editar Notas
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* Modal Nova Conta */}
      {isNewAccountModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-10 pb-0 shrink-0 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Nova Conta Ativa</h3>
              <button onClick={() => setIsNewAccountModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <ICONS.X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="flex-1 overflow-y-auto p-10 space-y-6 scrollbar-none">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Selecionar Empresa</label>
                  <select 
                    required
                    value={newAccountData.company_id}
                    onChange={e => setNewAccountData({...newAccountData, company_id: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="">Selecione uma empresa...</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Serviço Contratado</label>
                  <select 
                    required
                    value={newAccountData.service_name}
                    onChange={e => {
                      const selectedService = services.find(s => s.name === e.target.value);
                      setNewAccountData({
                        ...newAccountData, 
                        service_name: e.target.value,
                        monthly_value: selectedService ? selectedService.default_price : newAccountData.monthly_value
                      });
                    }}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="">Selecione um serviço...</option>
                    {services.map(service => (
                      <option key={service.id} value={service.name}>{service.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Valor Mensal (MRR)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                      <input 
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        placeholder="0,00"
                        value={newAccountData.monthly_value === 0 ? '' : newAccountData.monthly_value}
                        onChange={e => setNewAccountData({...newAccountData, monthly_value: parseFloat(e.target.value) || 0})}
                        className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Dia de Vencimento</label>
                    <input 
                      type="number"
                      required
                      min="1"
                      max="31"
                      placeholder="Ex: 10"
                      value={newAccountData.due_day === 0 ? '' : newAccountData.due_day}
                      onChange={e => setNewAccountData({...newAccountData, due_day: parseInt(e.target.value) || 0})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['ativo', 'pausado', 'cancelado'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setNewAccountData({...newAccountData, status: status as any})}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          newAccountData.status === status 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none' 
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Data de Início</label>
                  <input 
                    type="date"
                    required
                    value={newAccountData.start_date}
                    onChange={e => setNewAccountData({...newAccountData, start_date: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsNewAccountModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Criar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
