
import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { User, WorkspaceNav, M4Automation, CustomFieldDef } from '../types';
import { supabase } from '../lib/supabase';

const Admin: React.FC<{ currentUser: User | null; activeTab: string }> = ({ currentUser, activeTab }) => {
  const [activeSubTab, setActiveSubTab] = useState('users');

  useEffect(() => {
    if (activeTab === 'admin_users') setActiveSubTab('users');
    else if (activeTab === 'admin_workspaces') setActiveSubTab('workspaces');
    else if (activeTab === 'admin_settings') setActiveSubTab('settings');
  }, [activeTab]);
  const [users, setUsers] = useState<User[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceNav[]>([]);
  const [automations, setAutomations] = useState<M4Automation[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      try {
        const [usersRes, workspacesRes, automationsRes, fieldsRes] = await Promise.all([
          supabase.from('m4_users').select('*'),
          supabase.from('m4_workspaces').select('*'),
          supabase.from('m4_automations').select('*'),
          supabase.from('m4_custom_fields_def').select('*')
        ]);

        if (usersRes.data) setUsers(usersRes.data);
        if (workspacesRes.data) setWorkspaces(workspacesRes.data);
        if (automationsRes.data) setAutomations(automationsRes.data);
        if (fieldsRes.data) setCustomFields(fieldsRes.data);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const menuItems = [
    { id: 'users', label: 'Usuários e Permissões', icon: ICONS.Users },
    { id: 'workspaces', label: 'Workspaces', icon: ICONS.Dashboard },
    { id: 'settings', label: 'Configurações do Sistema', icon: ICONS.Settings },
    { id: 'reports', label: 'Relatórios e Analytics', icon: ICONS.Chart },
    { id: 'notifications', label: 'Notificações', icon: ICONS.Mail },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-700">
      <div className="flex justify-between items-center mb-10 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Painel Administrativo</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Gestão centralizada do seu workspace e equipe.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-8 shrink-0 overflow-x-auto scrollbar-none">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSubTab(item.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeSubTab === item.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <item.icon width="16" height="16" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-4 scrollbar-none pb-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Carregando dados...</p>
          </div>
        ) : (
          <>
            {activeSubTab === 'users' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Equipe ({users.length})</h3>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all">
                    + NOVO USUÁRIO
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {users.map(user => (
                    <div key={user.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 font-black text-lg">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 dark:text-white">{user.name}</h4>
                          <p className="text-xs font-bold text-slate-400">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
                            {user.role}
                          </span>
                          <p className={`text-[10px] font-bold mt-1 uppercase ${user.status === 'active' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {user.status === 'active' ? 'Ativo' : 'Inativo'}
                          </p>
                        </div>
                        <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                          <ICONS.Settings width="18" height="18" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSubTab === 'workspaces' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Meus Workspaces</h3>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all">
                    + NOVO WORKSPACE
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {workspaces.map(ws => (
                    <div key={ws.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg" style={{ backgroundColor: ws.color || '#2563eb' }}>
                          {ws.icon || ws.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-slate-900 dark:text-white">{ws.name}</h4>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Workspace ID: {ws.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
                          CONFIGURAR
                        </button>
                        <button className="px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all">
                          <ICONS.X width="16" height="16" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSubTab === 'settings' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center">
                      <ICONS.Automation width="24" height="24" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Automações</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{automations.length} Ativas</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {automations.map(auto => (
                      <div key={auto.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between">
                        <p className="font-bold text-sm text-slate-700 dark:text-slate-300">{auto.name}</p>
                        <div className={`w-10 h-5 rounded-full relative ${auto.is_active ? 'bg-blue-600' : 'bg-slate-300'}`}>
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${auto.is_active ? 'left-6' : 'left-1'}`}></div>
                        </div>
                      </div>
                    ))}
                    <button className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-blue-400 hover:text-blue-600 transition-all">
                      + CRIAR AUTOMAÇÃO
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center">
                      <ICONS.Database width="24" height="24" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Campos Customizados</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{customFields.length} Definidos</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {customFields.map(field => (
                      <div key={field.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="font-black text-sm text-slate-900 dark:text-white">{field.field_name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{field.entity_type} • {field.field_type}</p>
                        </div>
                        <button className="text-slate-400 hover:text-blue-600 transition-colors">
                          <ICONS.Settings width="16" height="16" />
                        </button>
                      </div>
                    ))}
                    <button className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-blue-400 hover:text-blue-600 transition-all">
                      + ADICIONAR CAMPO
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === 'reports' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { title: 'Performance de Vendas', desc: 'Conversão por vendedor e pipeline.', icon: ICONS.Sales },
                  { title: 'Produtividade', desc: 'Tarefas concluídas vs estimadas.', icon: ICONS.Tasks },
                  { title: 'Financeiro', desc: 'Fluxo de caixa e faturamento mensal.', icon: ICONS.Finance },
                ].map((report, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group cursor-pointer">
                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all mb-6">
                      <report.icon width="24" height="24" />
                    </div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{report.title}</h4>
                    <p className="text-sm text-slate-500 mt-2">{report.desc}</p>
                    <div className="mt-8 flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest">
                      GERAR RELATÓRIO <ICONS.Plus className="rotate-45" width="14" height="14" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSubTab === 'notifications' && (
              <div className="max-w-2xl bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-8">Preferências de Alerta</h3>
                <div className="space-y-8">
                  {[
                    { title: 'E-mails de Resumo', desc: 'Receba um resumo diário das atividades pendentes.' },
                    { title: 'Notificações Push', desc: 'Alertas em tempo real no navegador para novas tarefas.' },
                    { title: 'Lembretes de Vencimento', desc: 'Avisar 24h antes de uma tarefa vencer.' },
                    { title: 'Novos Leads', desc: 'Notificar quando um lead for atribuído a você.' },
                  ].map((pref, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="max-w-[80%]">
                        <p className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-tight">{pref.title}</p>
                        <p className="text-xs text-slate-500 font-medium mt-1">{pref.desc}</p>
                      </div>
                      <button className="w-12 h-6 rounded-full bg-blue-600 relative">
                        <div className="absolute top-1 left-7 w-4 h-4 bg-white rounded-full"></div>
                      </button>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-12 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs hover:bg-slate-800 transition-all">
                  SALVAR PREFERÊNCIAS
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
