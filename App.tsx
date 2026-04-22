
import React, { useState, useEffect } from 'react';
import { ICONS } from './constants';
import Companies from './pages/Companies';
import Contacts from './pages/Contacts';
import SupabaseStatus from './components/SupabaseStatus';
import UserMenu from './components/UserMenu';
import Login from './components/Login';
import { Pipeline, Lead, Task, Transaction, EmailMessage, M4Client, Project, Company, Contact, User, Service, FinanceCategory, PaymentMethod, FunnelStatus, UserRole } from './types';
import { supabase, getSupabaseConfig } from './lib/supabase';
import Setup from './pages/Setup';
import { AGENCY_PIPELINE_STAGES } from './constants';
import { CheckCircle2 } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import MyDay from './pages/MyDay';
import { useTheme } from './ThemeContext';
import { automationService } from './services/automationService';
import { leadService } from './services/leadService';
import { clientService } from './services/clientService';
import { useCRMStore } from './lib/store';
import { taskService } from './services/taskService';
import { workspaceService } from './services/workspaceService';
import { mappers, isUUID } from './lib/mappers';
import SalesCRM from './pages/SalesCRM';
import Clients from './pages/Clients';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import Finance from './pages/FinanceOrganizador';
import ClientAccounts from './pages/ClientAccounts';
import Automation from './pages/Automation';
import Collaboration from './pages/Collaboration';
import ContactCenter from './pages/ContactCenter';
import MarketingCRM from './pages/MarketingCRM';
import EmailModule from './pages/EmailModule';
import Settings from './pages/Settings';
import DataEnrichment from './pages/DataEnrichment';
import MeetingForms from './pages/MeetingForms';
import ClientsOverview from './pages/ClientsOverview';
import SalesOverview from './pages/SalesOverview';
import GoalSettings from './pages/GoalSettings';

import { useWorkspace } from './hooks/useWorkspace';

const App: React.FC = () => {
  const { theme } = useTheme();
  const { setIsLoadingLeads } = useCRMStore();
  const { workspaceId: resolvedWorkspaceId, loading: workspaceLoading } = useWorkspace();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMenus, setExpandedMenus] = useState({
    sales: true,
    clients: true,
    finance: true,
    admin: false
  });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // --- PWA INSTALLATION ---
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      console.log('PWA was installed');
    });
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', () => setDeferredPrompt(null));
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // --- GLOBAL STATE ---
  const [pipelines, setPipelines] = useState<Pipeline[]>([
    { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Vendas Comercial', stages: AGENCY_PIPELINE_STAGES },
    { id: '6262f0d6-8e20-496b-8076-f24e31e67fab', name: 'Gestão de Reuniões', stages: [
      { id: 'm1', name: 'Agendadas', status: FunnelStatus.INITIAL, position: 0, color: 'blue' }, 
      { id: 'm2', name: 'Confirmadas', status: FunnelStatus.INTERMEDIATE, position: 1, color: 'amber' }, 
      { id: 'm3', name: 'Realizadas', status: FunnelStatus.WON, position: 2, color: 'emerald' }
    ] }
  ]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [clients, setClients] = useState<M4Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientAccounts, setClientAccounts] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [financeCategories, setFinanceCategories] = useState<FinanceCategory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activePipelineId, setActivePipelineId] = useState<string>('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  const [settings, setSettings] = useState<any>({
    crm_name: 'M4 CRM',
    company_name: 'Agency Cloud',
    logo_url: '',
    primary_color: '#2563eb',
    theme: theme,
    city: '',
    state: '',
    website_url: '',
    whatsapp_number: '',
    language: 'pt-BR'
  });

  const config = getSupabaseConfig();
  const hasConfig = !!(config.url && config.key);

  // Handle navigation to specific pipelines from overview
  useEffect(() => {
    if (activeTab.startsWith('pipeline_')) {
      const pipelineId = activeTab.replace('pipeline_', '');
      setActivePipelineId(pipelineId);
      setActiveTab('sales');
    }
  }, [activeTab]);

  // --- MODAL STATES ---
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);

  // Update Favicon and Title based on Settings
  useEffect(() => {
    if (settings) {
      if (settings.crm_name) {
        document.title = settings.crm_name;
      }
      
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      
      if (settings.logo_url) {
        localStorage.setItem('m4_crm_logo_url', settings.logo_url);
        link.href = settings.logo_url;
      } else {
        localStorage.removeItem('m4_crm_logo_url');
        link.href = '/vite.svg'; // Default favicon fallback
      }
    }
  }, [settings]);

  const fetchLeads = async (wsId?: string) => {
    console.log('App.tsx fetchLeads() called for ws:', wsId);
    setIsLoadingLeads(true);
    try {
      const data = await leadService.getAll(wsId);
      console.log('App.tsx fetchLeads() success, count:', data?.length);
      setLeads(data);
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  const fetchServices = async () => {
    try {
      const { data: servicesData, error } = await supabase.from('m4_services').select('*').order('name');
      if (error) throw error;
      setServices(servicesData || []);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
    }
  };

  // Fetch Data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      if (workspaceLoading) return;
      const localUserId = localStorage.getItem('m4_crm_user_id');
      if (!localUserId || !resolvedWorkspaceId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        console.log('App: Fetching data for workspace:', resolvedWorkspaceId);
        
        const { data: user } = await supabase.from('m4_users').select('*').eq('id', localUserId).maybeSingle();
        const { data: authUserResult } = await supabase.auth.getUser();
        const authUser = authUserResult?.user;

        if (user) {
          setCurrentUser({ ...user, workspace_id: resolvedWorkspaceId });
        } else if (authUser) {
          setCurrentUser({
            id: authUser.id,
            name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário',
            email: authUser.email || '',
            role: 'owner' as any,
            workspace_id: resolvedWorkspaceId,
            status: 'active',
            created_at: authUser.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        const wsId = resolvedWorkspaceId;

        // Optimized safeFetch for M4 Schema v2
        const safeFetch = async (tableName: string, setter: (data: any[]) => void, options: { select?: string, order?: string, isDeleted?: boolean } = {}) => {
            try {
                let query = supabase.from(tableName).select(options.select || '*').eq('workspace_id', wsId);
                if (options.isDeleted) query = query.is('deleted_at', null);
                if (options.order) query = query.order(options.order, { ascending: options.order === 'created_at' ? false : true });
                const { data, error } = await query;
                if (!error) setter(data || []);
                else setter([]);
            } catch (err) { setter([]); }
        };

        // All Data
        await Promise.all([
          fetchLeads(wsId),
          safeFetch('m4_tasks', setTasks),
          safeFetch('m4_fin_transactions', setTransactions),
          safeFetch('m4_emails', setEmails, { order: 'created_at' }),
          safeFetch('m4_clients', setClients),
          safeFetch('m4_projects', setProjects),
          safeFetch('m4_posts', setPosts, { order: 'created_at' }),
          safeFetch('m4_campaigns', setCampaigns, { order: 'created_at' }),
          safeFetch('m4_fin_bank_accounts', setBankAccounts),
          safeFetch('m4_credit_cards', setCreditCards),
          safeFetch('m4_fin_categories', setFinanceCategories, { order: 'name' }),
          safeFetch('m4_fin_payment_methods', setPaymentMethods, { order: 'name' }),
          safeFetch('m4_companies', setCompanies, { isDeleted: true, order: 'name' }),
          safeFetch('m4_contacts', setContacts, { select: '*, company:m4_companies(id, name)', order: 'name' }),
          fetchServices(),
        ]);

        const { data: caData } = await supabase.from('m4_client_accounts').select('*, company:m4_companies(name)').eq('workspace_id', wsId);
        setClientAccounts(caData || []);

        const { data: settingsData } = await supabase.from('m4_settings').select('*').eq('workspace_id', wsId).maybeSingle();
        if (settingsData) setSettings(settingsData);

        const { data: pData } = await supabase.from('m4_pipelines').select('*').eq('workspace_id', wsId).order('position');
        const { data: sData } = await supabase.from('m4_pipeline_stages').select('*').order('position');
        
        if (pData && pData.length > 0) {
          const fullPipelines = pData.map(p => ({
            ...p,
            stages: (sData || []).filter(s => s.pipeline_id === p.id)
          }));
          setPipelines(fullPipelines);
          if (fullPipelines.length > 0) setActivePipelineId(fullPipelines[0].id);
        }
      } catch (err) {
        console.error("App: Fatal fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [resolvedWorkspaceId, workspaceLoading]);

  // Listen for automation execution events to refresh data
  useEffect(() => {
    const handleAutomationExecuted = (e: any) => {
      console.log('App.tsx: Automation executed, refreshing data...', e.detail);
      // We wait a bit to ensure DB has finished all operations
      setTimeout(() => {
        fetchLeads();
        // Also refresh tasks as some automations create tasks
        const refreshTasks = async () => {
          const { data: tasksData } = await supabase.from('m4_tasks').select('*');
          setTasks(tasksData || []);
        };
        refreshTasks();
      }, 1000);
    };

    window.addEventListener('m4_automation_executed', handleAutomationExecuted);
    return () => window.removeEventListener('m4_automation_executed', handleAutomationExecuted);
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('m4_crm_user_id');
    localStorage.removeItem('m4_crm_workspace_id');
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const handleStatusChange = async (leadId: string, status: 'won' | 'lost' | 'active', extraData?: any) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    try {
      await leadService.updateStatus(leadId, status);
      setLeads(leads.map(l => l.id === leadId ? { ...l, status } : l));
      
      const workspaceId = currentUser?.workspace_id || '';

      if (status === 'won') {
        await automationService.convertLeadToClient(lead, workspaceId);
        
        // Refresh data using services
        const clientsData = await clientService.getAll();
        setClients(clientsData);
        const tasksData = await taskService.getAll();
        setTasks(tasksData);
      } else if (status === 'lost') {
        const followUpTask = {
          title: `Follow-up: Lead Perdido - ${lead.company}`,
          description: `Motivo da perda: ${extraData?.reason || 'Não informado'}. Tentar contato em 3 meses.`,
          type: 'call' as const,
          priority: 'Baixa',
          status: 'Pendente',
          lead_id: lead.id,
          company_id: lead.company_id,
          due_date: new Date(Date.now() + 90 * 86400000).toISOString(),
        };

        const newTask = await taskService.create(followUpTask, workspaceId);
        setTasks([...tasks, newTask]);
      }
    } catch (err) {
      console.error('Error in status change:', err);
    }
  };

  const SidebarItem = ({ id, icon: Icon, label, hasSubItems, isExpanded, onToggle, isActive, overviewId }: any) => (
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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-950 flex-col gap-4 transition-colors duration-300">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-slate-400 uppercase tracking-widest text-[10px] animate-pulse">Iniciando Cloud M4...</p>
      </div>
    );
  }

  if (!hasConfig) {
    return <Setup />;
  }

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans transition-colors duration-300">
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
          <SidebarItem id="dashboard" icon={ICONS.Dashboard} label="Visão Geral" isActive={activeTab === 'dashboard'} />
          
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
                    isExpanded={item.menuKey ? expandedMenus[item.menuKey as keyof typeof expandedMenus] : false}
                    onToggle={item.menuKey ? () => setExpandedMenus({...expandedMenus, [item.menuKey!]: !expandedMenus[item.menuKey as keyof typeof expandedMenus]}) : undefined}
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
                        <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'finance_performance' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
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
                      <button onClick={() => setActiveTab('finance_counterparties')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'finance_counterparties' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'finance_counterparties' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                        Contrapartes
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

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-10 z-20">
          <div className="flex items-center gap-6 bg-muted px-6 py-2.5 rounded-[1.25rem] w-[500px] border border-border/50">
            <ICONS.Search className="text-muted-foreground dark:text-slate-500" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Pesquisar em tudo..." className="bg-transparent border-none outline-none text-sm w-full font-bold text-foreground" />
          </div>
          <div className="flex items-center gap-6">
            <SupabaseStatus />
            <UserMenu 
              user={currentUser} 
              onNavigate={setActiveTab} 
              onLogout={handleLogout} 
            />
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden p-10 scroll-smooth">
          {activeTab === 'dashboard' && (
            <Dashboard 
              leads={leads} 
              transactions={transactions} 
              tasks={tasks} 
              pipelines={pipelines} 
              currentUser={currentUser} 
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === 'my_day' && (
            <MyDay 
              tasks={tasks} 
              leads={leads} 
              companies={companies}
              currentUser={currentUser} 
              onUpdateTask={async (task) => {
                const { error } = await supabase.from('m4_tasks').update(mappers.task(task)).eq('id', task.id);
                if (!error) setTasks(tasks.map(t => t.id === task.id ? task : t));
              }}
            />
          )}
          {activeTab === 'clients_overview' && (
            <ClientsOverview 
              companies={companies} 
              contacts={contacts} 
              setActiveTab={setActiveTab}
              onNewCompany={() => setShowNewCompanyModal(true)}
              onNewContact={() => setShowNewContactModal(true)}
            />
          )}
          {activeTab === 'sales_overview' && (
            <SalesOverview 
              leads={leads} 
              setLeads={setLeads}
              pipelines={pipelines} 
              setActiveTab={setActiveTab}
              setActivePipelineId={setActivePipelineId}
              onNewLead={() => setShowNewLeadModal(true)}
              currentUser={currentUser}
              fetchLeads={fetchLeads}
            />
          )}
          {activeTab === 'emails' && <EmailModule emails={emails} setEmails={setEmails} currentUser={currentUser} />}
          {(activeTab === 'sales' || showNewLeadModal) && (
            <SalesCRM 
              pipelines={pipelines} 
              setPipelines={setPipelines}
              activePipelineId={activePipelineId} 
              setActivePipelineId={setActivePipelineId} 
              leads={leads} 
              setLeads={setLeads} 
              tasks={tasks}
              setTasks={setTasks}
              onStatusChange={handleStatusChange} 
              companies={companies}
              setCompanies={setCompanies}
              contacts={contacts}
              setContacts={setContacts}
              currentUser={currentUser}
              isModalOpen={showNewLeadModal}
              setIsModalOpen={setShowNewLeadModal}
              renderOnlyModal={activeTab !== 'sales'}
              services={services}
              bankAccounts={bankAccounts}
              setActiveTab={setActiveTab}
            />
          )}
          {(activeTab === 'companies' || showNewCompanyModal) && (
            <Companies 
              companies={companies} 
              setCompanies={setCompanies} 
              contacts={contacts} 
              setContacts={setContacts} 
              currentUser={currentUser}
              isModalOpen={showNewCompanyModal}
              setIsModalOpen={setShowNewCompanyModal}
              renderOnlyModal={activeTab !== 'companies'}
              clientAccounts={clientAccounts}
            />
          )}
          {(activeTab === 'contacts' || showNewContactModal) && (
            <Contacts 
              contacts={contacts} 
              setContacts={setContacts} 
              companies={companies} 
              setCompanies={setCompanies} 
              currentUser={currentUser}
              isModalOpen={showNewContactModal}
              setIsModalOpen={setShowNewContactModal}
              renderOnlyModal={activeTab !== 'contacts'}
            />
          )}
          {activeTab === 'enrichment' && <DataEnrichment pipelines={pipelines} onImportComplete={() => setActiveTab('sales')} currentUser={currentUser} />}
          {activeTab === 'meeting_forms' && <MeetingForms leads={leads} />}
          {activeTab === 'collaboration' && <Collaboration posts={posts} setPosts={setPosts} currentUser={currentUser} />}
          {activeTab === 'clients' && <Clients clients={clients} setClients={setClients} currentUser={currentUser} />}
          {activeTab === 'projects' && <Projects projects={projects} setProjects={setProjects} tasks={tasks} setTasks={setTasks} currentUser={currentUser} />}
          {activeTab === 'client_accounts' && <ClientAccounts leads={leads} tasks={tasks} transactions={transactions} clientAccounts={clientAccounts} setClientAccounts={setClientAccounts} companies={companies} services={services} workspaceId={currentUser?.workspace_id || resolvedWorkspaceId} />}
          {activeTab === 'tasks' && <Tasks tasks={tasks} setTasks={setTasks} currentUser={currentUser} />}
          {(activeTab === 'finance' || activeTab.startsWith('finance_')) && <Finance currentUser={currentUser} activeTab={activeTab} />}
          {activeTab === 'marketing' && <MarketingCRM leads={leads} campaigns={campaigns} />}
          {activeTab === 'goal_settings' && <GoalSettings currentUser={currentUser} />}
          {activeTab === 'contact' && <ContactCenter />}
          {(activeTab === 'settings' || activeTab.startsWith('settings_')) && (
            <Settings 
              currentUser={currentUser} 
              onUserUpdate={setCurrentUser} 
              settings={settings}
              setSettings={setSettings}
              services={services} 
              setServices={setServices} 
              fetchServices={fetchServices} 
              pipelines={pipelines}
              setPipelines={setPipelines}
              activeTab={activeTab}
              leads={leads}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
