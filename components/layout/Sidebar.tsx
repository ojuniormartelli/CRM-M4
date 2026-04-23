
import React from 'react';
import { ICONS } from '../../constants';
import { CheckCircle2 } from 'lucide-react';
import { UserRole } from '../../types';

interface SidebarProps {
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  expandedMenus: {
    sales: boolean;
    clients: boolean;
    finance: boolean;
    admin: boolean;
  };
  setExpandedMenus: (menus: any) => void;
  pipelines: any[];
  setActivePipelineId: (id: string) => void;
  activePipelineId: string;
  settings: any;
  currentUser: any;
  deferredPrompt: any;
  handleInstallClick: () => void;
}

const SidebarItem = ({ id, icon: Icon, label, hasSubItems, isExpanded, onToggle, isActive, overviewId, isSidebarOpen, setActiveTab }: any) => (
  <div className="space-y-1">
    <button
      onClick={() => {
        if (hasSubItems) {
          if (isSidebarOpen) {
            onToggle();
          } else if (overviewId) {
            setActiveTab(overviewId);
          }
        } else {
          setActiveTab(id);
        }
      }}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 ${
        isActive && (!hasSubItems || !isSidebarOpen)
          ? 'bg-blue-600 text-white shadow-xl shadow-blue-100/50 scale-[1.02]' 
          : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon />
        <span className={`font-bold text-sm whitespace-nowrap transition-opacity ${!isSidebarOpen ? 'opacity-0' : 'opacity-100'}`}>{label}</span>
      </div>
      {hasSubItems && isSidebarOpen && (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
      )}
    </button>
  </div>
);

const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  setSidebarOpen,
  activeTab,
  setActiveTab,
  expandedMenus,
  setExpandedMenus,
  pipelines,
  setActivePipelineId,
  activePipelineId,
  settings,
  currentUser,
  deferredPrompt,
  handleInstallClick
}) => {
  const menuSections = [
    {
      title: "Workspaces",
      items: [
        { id: 'my_day', icon: CheckCircle2, label: 'Meu Dia' },
        { id: 'comercial', icon: ICONS.Sales, label: 'Comercial', hasSubItems: true, menuKey: 'sales', overviewId: 'sales_overview' },
        { id: 'operacao', icon: ICONS.Tasks, label: 'Operação', hasSubItems: true, menuKey: 'clients', overviewId: 'clients_overview' },
        { id: 'finance_group', icon: ICONS.Finance, label: 'Financeiro', hasSubItems: true, menuKey: 'finance' },
        { id: 'settings_group', icon: ICONS.Settings, label: 'Configurações', hasSubItems: true, menuKey: 'admin' },
      ]
    },
    {
      title: "Comercial",
      items: [
        { id: 'meeting_forms', icon: ICONS.Form, label: 'Sondagem & Reunião' },
        { id: 'goal_settings', icon: ICONS.Target, label: 'Metas de Vendas' },
        { id: 'client_accounts', icon: ICONS.Clients, label: 'Contas Ativas' },
      ]
    },
    {
      title: "Operacional",
      items: [
        { id: 'tasks', icon: ICONS.Tasks, label: 'Minhas Tarefas' },
        { id: 'projects', icon: ICONS.Projects, label: 'Projetos & Squads' },
      ]
    }
  ];

  return (
    <aside className={`${isSidebarOpen ? 'w-80' : 'w-24'} bg-card border-r border-border transition-all duration-500 flex flex-col z-30 shadow-2xl shadow-slate-200/20 dark:shadow-none`}>
      <div className="p-8 flex items-center gap-4 border-b border-border h-24 shrink-0">
        <div className="w-11 h-11 bg-gradient-to-tr from-blue-700 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-100 overflow-hidden">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            'M4'
          )}
        </div>
        <div className={`transition-all duration-500 ${!isSidebarOpen ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
          <h1 className="font-black text-foreground text-xl leading-none">{settings?.crm_name || 'M4 CRM'}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[10px] font-black text-primary uppercase">{settings?.company_name || 'Agency Cloud'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto scrollbar-none">
        <SidebarItem 
          id="dashboard" 
          icon={ICONS.Dashboard} 
          label="Visão Geral" 
          isActive={activeTab === 'dashboard'} 
          isSidebarOpen={isSidebarOpen}
          setActiveTab={setActiveTab}
        />
        
        {menuSections.map((section, sIdx) => (
          <React.Fragment key={sIdx}>
            <div className={`pt-8 pb-3 px-6 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] transition-opacity ${!isSidebarOpen && 'opacity-0'}`}>
              {section.title}
            </div>
            {section.items.map(item => (
              <React.Fragment key={item.id}>
                <SidebarItem 
                  id={item.id}
                  icon={item.icon}
                  label={item.label}
                  isActive={
                    item.id === 'sales' ? (activeTab === 'sales' || activeTab === 'sales_overview') :
                    item.id === 'clients_group' ? (activeTab === 'companies' || activeTab === 'contacts' || activeTab === 'clients_overview') :
                    activeTab === item.id
                  }
                  hasSubItems={item.hasSubItems}
                  overviewId={item.overviewId}
                  isSidebarOpen={isSidebarOpen}
                  setActiveTab={setActiveTab}
                  isExpanded={item.menuKey ? (expandedMenus as any)[item.menuKey] : false}
                  onToggle={item.menuKey ? () => setExpandedMenus({...expandedMenus, [item.menuKey!]: !(expandedMenus as any)[item.menuKey]}) : undefined}
                />
                
                {item.id === 'comercial' && expandedMenus.sales && isSidebarOpen && (
                  <div className="ml-10 space-y-1 mt-2 animate-in slide-in-from-top-4 duration-300">
                    <button
                      onClick={() => setActiveTab('sales_overview')}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${
                        activeTab === 'sales_overview'
                          ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' 
                          : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'sales_overview' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      Visão Geral
                    </button>
                    {pipelines.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setActivePipelineId(p.id);
                          setActiveTab('sales');
                        }}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${
                          activeTab === 'sales' && activePipelineId === p.id 
                            ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' 
                            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'sales' && activePipelineId === p.id ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}

                {item.id === 'operacao' && expandedMenus.clients && isSidebarOpen && (
                  <div className="ml-10 space-y-1 mt-2 animate-in slide-in-from-top-4 duration-300">
                    <button
                      onClick={() => setActiveTab('clients_overview')}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${
                        activeTab === 'clients_overview'
                          ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' 
                          : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'clients_overview' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      Visão Geral
                    </button>
                    <button
                      onClick={() => setActiveTab('companies')}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${
                        activeTab === 'companies'
                          ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' 
                          : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'companies' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      Empresas
                    </button>
                    <button
                      onClick={() => setActiveTab('contacts')}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${
                        activeTab === 'contacts'
                          ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' 
                          : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'contacts' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      Contatos
                    </button>
                  </div>
                )}

                {item.id === 'finance_group' && expandedMenus.finance && isSidebarOpen && (
                  <div className="ml-10 space-y-1 mt-2 animate-in slide-in-from-top-4 duration-300">
                    <button onClick={() => setActiveTab('finance_dashboard')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'finance_dashboard' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'finance_dashboard' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      Dashboard
                    </button>
                    <button onClick={() => setActiveTab('finance_transactions')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'finance_transactions' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'finance_transactions' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      Lançamentos
                    </button>
                    <button onClick={() => setActiveTab('finance_dre')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'finance_dre' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'finance_dre' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      DRE Gerencial
                    </button>
                    <button onClick={() => setActiveTab('finance_performance')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'finance_performance' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'performance' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      Performance & KPIs
                    </button>
                    <div className="pt-2 pb-1 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cadastros</div>
                    <button onClick={() => setActiveTab('finance_accounts')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'finance_accounts' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'finance_accounts' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      Contas Bancárias
                    </button>
                    <button onClick={() => setActiveTab('finance_categories')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'finance_categories' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'finance_categories' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      Categorias
                    </button>
                    <button onClick={() => setActiveTab('finance_cost_centers')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'finance_cost_centers' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'finance_cost_centers' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      Centros de Custo
                    </button>
                    <button onClick={() => setActiveTab('finance_payment_methods')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'finance_payment_methods' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'finance_payment_methods' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      Métodos de Pagto
                    </button>
                    <button onClick={() => setActiveTab('finance_settings')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'finance_settings' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'finance_settings' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      Configurações
                    </button>
                  </div>
                )}
                {item.id === 'settings_group' && expandedMenus.admin && isSidebarOpen && (
                  <div className="ml-10 space-y-1 mt-2 animate-in slide-in-from-top-4 duration-300">
                    <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'settings' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      Geral
                    </button>
                    <button onClick={() => setActiveTab('settings_profile')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'settings_profile' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'settings_profile' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      Meu Perfil
                    </button>
                    <button onClick={() => setActiveTab('settings_users')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'settings_users' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'settings_users' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      Equipe (Usuários e Cargos)
                    </button>
                    <button onClick={() => setActiveTab('settings_workspaces')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'settings_workspaces' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'settings_workspaces' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      Workspaces
                    </button>
                    <button onClick={() => setActiveTab('settings_branding')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'settings_branding' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'settings_branding' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      Sistema (Branding)
                    </button>
                    <button onClick={() => setActiveTab('settings_services')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'settings_services' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'settings_services' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      Serviços
                    </button>
                    <button onClick={() => setActiveTab('settings_pipelines')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'settings_pipelines' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'settings_pipelines' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      Funil de Vendas
                    </button>
                    <button onClick={() => setActiveTab('settings_automation')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'settings_automation' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'settings_automation' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      Automações
                    </button>
                    {currentUser?.role === UserRole.OWNER && (
                      <>
                        <button onClick={() => setActiveTab('settings_backup')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'settings_backup' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'settings_backup' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                          Backup
                        </button>
                        <button onClick={() => setActiveTab('settings_technical')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'settings_technical' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'settings_technical' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                          Painel Técnico
                        </button>
                      </>
                    )}
                  </div>
                )}
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}

        {deferredPrompt && (
          <div className="pt-8 mt-8 border-t border-border">
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 bg-primary/10 text-primary hover:bg-primary/20 group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ICONS.Download className="w-5 h-5" />
              </div>
              <div className={`transition-all duration-500 ${!isSidebarOpen ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
                <p className="text-xs font-black uppercase tracking-widest">Instalar App</p>
                <p className="text-[9px] font-bold text-primary/60 uppercase mt-0.5">Versão Desktop</p>
              </div>
            </button>
          </div>
        )}
      </nav>

      <div className="p-6 border-t border-border">
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="w-full flex items-center justify-center p-3 text-muted-foreground dark:text-slate-500 hover:text-primary rounded-2xl transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`${!isSidebarOpen ? 'rotate-180' : ''}`}><path d="m15 18-6-6 6-6"/></svg>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
