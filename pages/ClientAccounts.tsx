import React, { useState, useEffect } from 'react';
import * as ICONS from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ClientAccount, Lead, Task, Transaction, Interaction } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientAccountsProps {
  leads: Lead[];
  tasks: Task[];
  transactions: Transaction[];
  clientAccounts: ClientAccount[];
  setClientAccounts: React.Dispatch<React.SetStateAction<ClientAccount[]>>;
}

export default function ClientAccounts({ leads, tasks, transactions, clientAccounts, setClientAccounts }: ClientAccountsProps) {
  const [selectedAccount, setSelectedAccount] = useState<ClientAccount | null>(null);
  const [view, setView] = useState<'list' | 'details'>('list');

  const getLeadName = (leadId: string) => {
    return leads.find(l => l.id === leadId)?.name || 'Cliente Desconhecido';
  };

  const getAccountStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-emerald-100 text-emerald-700';
      case 'pausado': return 'bg-amber-100 text-amber-700';
      case 'cancelado': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getAccountHistory = (leadId: string) => {
    const leadTasks = tasks.filter(t => t.lead_id === leadId).map(t => ({
      type: 'Tarefa',
      title: t.title,
      date: t.due_date || t.created_at,
      status: t.status,
      icon: <ICONS.CheckCircle className="w-4 h-4" />
    }));

    const leadTransactions = transactions.filter(t => t.lead_id === leadId).map(t => ({
      type: 'Financeiro',
      title: `${t.type}: ${t.description}`,
      date: t.date,
      status: t.status,
      icon: <ICONS.DollarSign className="w-4 h-4" />
    }));

    const lead = leads.find(l => l.id === leadId);
    const leadInteractions = (lead?.interactions || []).map(i => ({
      type: 'Interação',
      title: i.title,
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
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Clientes Ativos</h1>
              <p className="text-slate-500 text-sm">Acompanhamento e gestão de contas em dia.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <ICONS.Users className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Contas Ativas</span>
              </div>
              <p className="text-3xl font-black text-slate-800">{clientAccounts.filter(a => a.status === 'ativo').length}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <ICONS.TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">MRR Total</span>
              </div>
              <p className="text-3xl font-black text-slate-800">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  clientAccounts.filter(a => a.status === 'ativo').reduce((acc, curr) => acc + (Number(curr.monthly_value) || 0), 0)
                )}
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <ICONS.AlertCircle className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Acompanhamento</span>
              </div>
              <p className="text-3xl font-black text-slate-800">Em dia</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Serviço</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Mensal</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      Nenhum cliente ativo encontrado.
                    </td>
                  </tr>
                ) : (
                  clientAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{getLeadName(account.lead_id)}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Desde {format(new Date(account.start_date), 'dd/MM/yyyy')}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-600">{account.service_type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${getAccountStatusColor(account.status)}`}>
                          {account.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-700">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.monthly_value)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => { setSelectedAccount(account); setView('details'); }}
                          className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all"
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
              className="flex items-center gap-2 text-slate-400 hover:text-slate-800 mb-6 transition-colors group"
            >
              <ICONS.ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-widest">Voltar para lista</span>
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-1">{getLeadName(selectedAccount.lead_id)}</h2>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${getAccountStatusColor(selectedAccount.status)}`}>
                          {selectedAccount.status}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">{selectedAccount.service_type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Mensal</p>
                      <p className="text-2xl font-black text-blue-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedAccount.monthly_value)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Início</p>
                      <p className="text-sm font-bold text-slate-700">{format(new Date(selectedAccount.start_date), 'dd/MM/yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Modelo</p>
                      <p className="text-sm font-bold text-slate-700 uppercase">{selectedAccount.billing_model}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Próximo Check-in</p>
                      <p className="text-sm font-bold text-emerald-600">Em 3 dias</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saúde</p>
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full w-[85%]"></div>
                        </div>
                        <span className="text-[10px] font-black text-emerald-600">85%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Histórico Unificado</h3>
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-slate-50 text-slate-400 rounded-lg transition-colors"><ICONS.Filter className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
                      {getAccountHistory(selectedAccount.lead_id).map((item, i) => (
                        <div key={i} className="flex gap-6 relative">
                          <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 z-10 shadow-sm">
                            {item.icon}
                          </div>
                          <div className="flex-1 pb-6 border-b border-slate-50 last:border-0">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="text-sm font-bold text-slate-800">{item.title}</h4>
                              <span className="text-[10px] font-medium text-slate-400">{format(new Date(item.date), 'dd MMM, yyyy', { locale: ptBR })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.type}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
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
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-6">Ações Rápidas</h3>
                  <div className="space-y-3">
                    <button className="w-full flex items-center gap-3 p-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                      <ICONS.Plus className="w-4 h-4" />
                      <span className="text-xs font-bold">Nova Tarefa</span>
                    </button>
                    <button className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 text-slate-600 hover:bg-slate-50 transition-all">
                      <ICONS.DollarSign className="w-4 h-4" />
                      <span className="text-xs font-bold">Lançar Recebimento</span>
                    </button>
                    <button className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 text-slate-600 hover:bg-slate-50 transition-all">
                      <ICONS.FileText className="w-4 h-4" />
                      <span className="text-xs font-bold">Gerar Relatório</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl shadow-slate-200">
                  <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-4">Notas da Conta</h3>
                  <p className="text-sm text-slate-300 leading-relaxed italic">
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
    </div>
  );
}
