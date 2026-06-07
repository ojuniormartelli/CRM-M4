
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
  clients?: any[];
  setSelectedClientId?: (id: string | null) => void;
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
      className={`w-full flex items-center justify-between px-4 py-2 rounded-xl transition-all duration-300 ${
        isActive && (!hasSubItems || !isSidebarOpen)
          ? 'bg-blue-600 text-white shadow-xl shadow-blue-100/50 scale-[1.02]' 
          : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon />
        <span className={`font-bold text-sm whitespace-nowrap transition-opacity ${!isSidebarOpen ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>{label}</span>
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
  handleInstallClick,
  clients = [],
  setSelectedClientId
}) => {
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
  const [hoverTimeout, setHoverTimeout] = React.useState<NodeJS.Timeout|null>(null);
  const [flyoutTop, setFlyoutTop] = React.useState<number>(0);

  const [recentClientItems, setRecentClientItems] = React.useState<any[]>([]);

  const loadRecentClients = React.useCallback(() => {
    if (!clients || clients.length === 0) return;
    try {
      const recentsJSON = localStorage.getItem('m4_recent_clients');
      const recentIds: string[] = recentsJSON ? JSON.parse(recentsJSON) : [];
      const loaded = recentIds
        .map(id => clients.find(c => c.id === id))
        .filter(Boolean);
      setRecentClientItems(loaded);
    } catch (e) {
      console.error(e);
    }
  }, [clients]);

  React.useEffect(() => {
    loadRecentClients();
    const handleRecentsChange = () => loadRecentClients();
    window.addEventListener('m4_recent_clients_changed', handleRecentsChange);
    return () => {
      window.removeEventListener('m4_recent_clients_changed', handleRecentsChange);
    };
  }, [loadRecentClients]);

  const handleMouseEnter = (id: string, e: React.MouseEvent) => {
    if (isSidebarOpen) return;
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    
    // Calculate position for fixed flyout
    const rect = e.currentTarget.getBoundingClientRect();
    setFlyoutTop(rect.top);
    setHoveredItem(id);
  };

  const handleMouseLeave = () => {
    if (isSidebarOpen) return;
    // Debounce closing to allow moving mouse to the flyout
    const timeout = setTimeout(() => {
      setHoveredItem(null);
    }, 450);
    setHoverTimeout(timeout);
  };

  const handleFlyoutEnter = (id: string) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setHoveredItem(id);
  };

  const renderSubItems = (itemId: string, isFlyout: boolean = false) => {
    const commonClass = isFlyout 
      ? "w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2"
      : "w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2";
    
    const containerClass = isFlyout
      ? "space-y-1 animate-in fade-in slide-in-from-left-2 duration-200"
      : "ml-10 space-y-1 mt-2 animate-in slide-in-from-top-4 duration-300";

    switch(itemId) {
      case 'comercial':
        return (
          <div className={containerClass}>
            <button
              onClick={() => setActiveTab('sales_overview')}
              className={`${commonClass} ${
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
                className={`${commonClass} ${
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
        );
      case 'operacao':
        return (
          <div className={containerClass}>
            <button
              onClick={() => {
                if (setSelectedClientId) setSelectedClientId(null);
                setActiveTab('clients_overview');
              }}
              className={`${commonClass} ${
                activeTab === 'clients_overview'
                  ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' 
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'clients_overview' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              Resumo / Visão Geral
            </button>
            <button
              onClick={() => {
                if (setSelectedClientId) setSelectedClientId(null);
                setActiveTab('clients');
              }}
              className={`${commonClass} ${
                activeTab === 'clients'
                  ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' 
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'clients' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              Clientes Ativos
            </button>

            {recentClientItems.length > 0 && isSidebarOpen && (
              <div className="pt-3 pb-1 pl-2 mt-2 border-t border-slate-100 dark:border-slate-800/40 animate-in fade-in duration-300">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-1">Recentes</span>
                <div className="space-y-1">
                  {recentClientItems.map(client => (
                    <button
                      key={client.id}
                      onClick={() => {
                        if (setSelectedClientId) setSelectedClientId(client.id);
                        setActiveTab('clients');
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-550 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-850 flex items-center gap-2 group transition-all"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                      <span className="truncate flex-1">{client.company_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );;;
      case 'finance_group':
        return (
          <div className={containerClass}>
            <button onClick={() => setActiveTab('finance_dashboard')} className={`${commonClass} ${activeTab === 'finance_dashboard' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'finance_dashboard' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              Dashboard
            </button>
            <button onClick={() => setActiveTab('finance_transactions')} className={`${commonClass} ${activeTab === 'finance_transactions' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'finance_transactions' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              Lançamentos
            </button>
            <button onClick={() => setActiveTab('finance_dre')} className={`${commonClass} ${activeTab === 'finance_dre' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'finance_dre' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              DRE Gerencial
            </button>
            <button onClick={() => setActiveTab('finance_performance')} className={`${commonClass} ${activeTab === 'finance_performance' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'performance' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              Performance & KPIs
            </button>
            <div className="pt-2 pb-1 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cadastros</div>
            <button onClick={() => setActiveTab('finance_accounts')} className={`${commonClass} ${activeTab === 'finance_accounts' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'finance_accounts' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              Contas Bancárias
            </button>
            <button onClick={() => setActiveTab('finance_categories')} className={`${commonClass} ${activeTab === 'finance_categories' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'finance_categories' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              Categorias
            </button>
            <button onClick={() => setActiveTab('finance_cost_centers')} className={`${commonClass} ${activeTab === 'finance_cost_centers' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'finance_cost_centers' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              Centros de Custo
            </button>
            <button onClick={() => setActiveTab('finance_payment_methods')} className={`${commonClass} ${activeTab === 'finance_payment_methods' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'finance_payment_methods' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              Métodos de Pagto
            </button>
          </div>
        );
      case 'settings_group':
        return (
          <div className={containerClass}>
            <button onClick={() => setActiveTab('settings_branding')} className={`${commonClass} ${activeTab === 'settings_branding' || activeTab === 'settings' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'settings_branding' || activeTab === 'settings' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              Geral e Branding
            </button>
            <button onClick={() => setActiveTab('settings_profile')} className={`${commonClass} ${activeTab === 'settings_profile' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'settings_profile' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              Meu Perfil
            </button>
            <button onClick={() => setActiveTab('settings_users')} className={`${commonClass} ${activeTab === 'settings_users' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'settings_users' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              Equipe (Usuários e Cargos)
            </button>
            <button onClick={() => setActiveTab('settings_workspaces')} className={`${commonClass} ${activeTab === 'settings_workspaces' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'settings_workspaces' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              Workspaces
            </button>
            <button onClick={() => setActiveTab('settings_services')} className={`${commonClass} ${activeTab === 'settings_services' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'settings_services' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              Serviços
            </button>
            <button onClick={() => setActiveTab('settings_pipelines')} className={`${commonClass} ${activeTab === 'settings_pipelines' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'settings_pipelines' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              Funil de Vendas
            </button>
            <button onClick={() => setActiveTab('settings_automation')} className={`${commonClass} ${activeTab === 'settings_automation' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'settings_automation' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              Automações
            </button>
            {currentUser?.role === UserRole.OWNER && (
              <>
                <button onClick={() => setActiveTab('settings_backup')} className={`${commonClass} ${activeTab === 'settings_backup' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'settings_backup' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                  Backup
                </button>
                <button onClick={() => setActiveTab('settings_technical')} className={`${commonClass} ${activeTab === 'settings_technical' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'settings_technical' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                  Painel Técnico
                </button>
              </>
            )}
            <div className="pt-2 pb-1 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-100 dark:border-slate-800/40 mt-2">Bases de Apoio</div>
            <button onClick={() => setActiveTab('companies')} className={`${commonClass} ${activeTab === 'companies' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'companies' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              Banco de Empresas
            </button>
            <button onClick={() => setActiveTab('contacts')} className={`${commonClass} ${activeTab === 'contacts' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'contacts' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              Banco de Contatos
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  const menuSections = [
    {
      title: "Workspaces",
      items: [
        { id: 'my_day', icon: CheckCircle2, label: 'Meu Dia' },
        { id: 'comercial', icon: ICONS.Sales, label: 'Comercial', hasSubItems: true, menuKey: 'sales', overviewId: 'sales_overview' },
        { id: 'operacao', icon: ICONS.Tasks, label: 'Operação', hasSubItems: true, menuKey: 'clients', overviewId: 'clients_overview' },
      ]
    },
    {
      title: "CRM & Operação",
      items: [
        { id: 'meeting_forms', icon: ICONS.Form, label: 'Sondagem & Reunião' },
        { id: 'goal_settings', icon: ICONS.Target, label: 'Metas de Vendas' },
        { id: 'tasks', icon: ICONS.Tasks, label: 'Minhas Tarefas' },
        { id: 'projects', icon: ICONS.Projects, label: 'Projetos & Squads' },
      ]
    },
    {
      title: "Administrativo",
      items: [
        { id: 'finance_group', icon: ICONS.Finance, label: 'Financeiro', hasSubItems: true, menuKey: 'finance' },
        { id: 'settings_group', icon: ICONS.Settings, label: 'Configurações', hasSubItems: true, menuKey: 'admin' },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[25] lg:hidden animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 ${isSidebarOpen ? 'w-72' : 'w-0 lg:w-20'} bg-card border-r border-border transition-all duration-500 flex flex-col z-30 shadow-2xl shadow-slate-200/20 dark:shadow-none overflow-hidden lg:overflow-visible`}>
      <div className="p-6 flex items-center gap-4 border-b border-border h-20 shrink-0">
        <div className="w-10 h-10 bg-gradient-to-tr from-blue-700 to-indigo-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-100 overflow-hidden">
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

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-none">
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
            <div className={`pt-6 pb-2 px-6 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] transition-opacity ${!isSidebarOpen && 'opacity-0'}`}>
              {section.title}
            </div>
            {section.items.map(item => (
              <div 
                key={item.id} 
                className="relative group/nav-item"
                onMouseEnter={(e) => handleMouseEnter(item.id, e)}
                onMouseLeave={handleMouseLeave}
              >
                <SidebarItem 
                  id={item.id}
                  icon={item.icon}
                  label={item.label}
                  isActive={
                    item.id === 'sales' ? (activeTab === 'sales' || activeTab === 'sales_overview') :
                    item.id === 'operacao' ? (activeTab === 'clients' || activeTab === 'clients_overview') :
                    item.id === 'settings_group' ? (activeTab.startsWith('settings_') || activeTab === 'settings' || activeTab === 'companies' || activeTab === 'contacts') :
                    activeTab === item.id
                  }
                  hasSubItems={item.hasSubItems}
                  overviewId={item.overviewId}
                  isSidebarOpen={isSidebarOpen}
                  setActiveTab={setActiveTab}
                  isExpanded={item.menuKey ? (expandedMenus as any)[item.menuKey] : false}
                  onToggle={item.menuKey ? () => setExpandedMenus({...expandedMenus, [item.menuKey!]: !(expandedMenus as any)[item.menuKey]}) : undefined}
                />
                
                {/* Flyout Submenu for Collapsed Sidebar */}
                {!isSidebarOpen && item.hasSubItems && hoveredItem === item.id && (
                  <div 
                    className="fixed left-[64px] py-4 px-2 w-64 bg-card border border-border shadow-[20px_20px_60px_rgba(0,0,0,0.3)] rounded-2xl z-[9999] animate-in fade-in slide-in-from-left-2 duration-200"
                    style={{ top: flyoutTop - 8 }}
                    onMouseEnter={() => handleFlyoutEnter(item.id)}
                    onMouseLeave={handleMouseLeave}
                  >
                    {/* Hover Bridge: A transparent bridge between sidebar and flyout */}
                    <div className="absolute -left-4 top-0 bottom-0 w-6 bg-transparent" />
                    
                    <div className="px-4 pb-2 mb-2 border-b border-border/50">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">{item.label}</p>
                    </div>
                    {renderSubItems(item.id, true)}
                  </div>
                )}
                
                {item.id === 'comercial' && expandedMenus.sales && isSidebarOpen && renderSubItems('comercial')}
                {item.id === 'operacao' && expandedMenus.clients && isSidebarOpen && renderSubItems('operacao')}
                {item.id === 'finance_group' && expandedMenus.finance && isSidebarOpen && renderSubItems('finance_group')}
                {item.id === 'settings_group' && expandedMenus.admin && isSidebarOpen && renderSubItems('settings_group')}
              </div>
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
    </>
  );
};

export default Sidebar;
