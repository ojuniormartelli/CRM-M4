
import React, { useState, useEffect } from 'react';
import { ICONS } from './constants';
import Companies from './pages/Companies';
import Contacts from './pages/Contacts';
import SupabaseStatus from './components/SupabaseStatus';
import UserMenu from './components/UserMenu';
import Login from './components/Login';
import { Pipeline, Lead, Task, Transaction, EmailMessage, Client, Project, AppMode, Company, Contact, User, Service, FinanceCategory, PaymentMethod, FunnelStatus } from './types';
import { supabase, getSupabaseConfig } from './lib/supabase';
import Setup from './pages/Setup';
import { AGENCY_PIPELINE_STAGES } from './constants';
import Dashboard from './pages/Dashboard';
import SalesCRM from './pages/SalesCRM';
import Clients from './pages/Clients';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import Finance from './pages/Finance';
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

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMenus, setExpandedMenus] = useState({
    sales: true,
    clients: true
  });
  const [loading, setLoading] = useState(true);
  const [appMode, setAppMode] = useState<AppMode>(AppMode.EUGENCIA);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- GLOBAL STATE ---
  const [pipelines, setPipelines] = useState<Pipeline[]>([
    { id: 'e167f4e8-4a19-4ab7-b655-f104004f8bf4', name: 'Vendas Comercial', stages: AGENCY_PIPELINE_STAGES },
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
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientAccounts, setClientAccounts] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [financeCategories, setFinanceCategories] = useState<FinanceCategory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activePipelineId, setActivePipelineId] = useState<string>('e167f4e8-4a19-4ab7-b655-f104004f8bf4');
  const [settings, setSettings] = useState<any>(null);

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
      if (settings.logo_url) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = settings.logo_url;
      }
    }
  }, [settings]);

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from('m4_leads')
      .select('*');
    if (error) console.error('Erro ao buscar leads:', error);
    else if (data) setLeads(data);
  };

  const fetchServices = async () => {
    try {
      const { data: servicesData, error } = await supabase.from('m4_services').select('*').order('name');
      if (error) throw error;
      console.log('fetchServices result:', servicesData);
      setServices(servicesData || []);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
    }
  };

  // Fetch Data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Check for local session and fetch User first
        const localUserId = localStorage.getItem('m4_crm_user_id');
        let user = null;
        if (localUserId) {
          const { data: userData } = await supabase.from('m4_users').select('*').eq('id', localUserId).maybeSingle();
          user = userData;
          if (user) setCurrentUser(user);
        }

        // 2. Fetch all other data
        await fetchLeads();

        const { data: tasksData } = await supabase.from('m4_tasks').select('*');
        setTasks(tasksData || []);

        const { data: transactionsData } = await supabase.from('m4_transactions').select('*');
        setTransactions(transactionsData || []);

        const { data: emailsData } = await supabase.from('m4_emails').select('*').order('created_at', { ascending: false });
        setEmails(emailsData || []);

        const { data: clientsData } = await supabase.from('m4_clients').select('*');
        setClients(clientsData || []);

        const { data: projectsData } = await supabase.from('m4_projects').select('*');
        setProjects(projectsData || []);

        const { data: settingsData } = await supabase.from('m4_settings').select('*').maybeSingle();
        setSettings(settingsData);

        const { data: postsData } = await supabase.from('m4_posts').select('*').order('created_at', { ascending: false });
        setPosts(postsData || []);

        const { data: campaignsData } = await supabase.from('m4_campaigns').select('*').order('created_at', { ascending: false });
        setCampaigns(campaignsData || []);

        const { data: clientAccountsData } = await supabase.from('m4_client_accounts').select('*, company:m4_companies(name)');
        setClientAccounts(clientAccountsData || []);

        await fetchServices();

        const { data: bankAccountsData } = await supabase.from('m4_bank_accounts').select('*');
        setBankAccounts(bankAccountsData || []);

        const { data: creditCardsData } = await supabase.from('m4_credit_cards').select('*');
        setCreditCards(creditCardsData || []);

        const { data: financeCategoriesData } = await supabase.from('m4_finance_categories').select('*').order('name');
        setFinanceCategories(financeCategoriesData || []);

        const { data: paymentMethodsData } = await supabase.from('m4_payment_methods').select('*').order('name');
        setPaymentMethods(paymentMethodsData || []);

        const { data: companiesData } = await supabase.from('m4_companies').select('*').order('name');
        setCompanies(companiesData || []);

        const { data: contactsData } = await supabase.from('m4_contacts').select('*, company:m4_companies(id, name)').order('name');
        setContacts(contactsData || []);

        // 3. Fetch Pipelines and Stages
        let { data: pipelinesData, error: pError } = await supabase.from('m4_pipelines').select('*').order('position');
        let { data: stagesData, error: sError } = await supabase.from('m4_pipeline_stages').select('*').order('position');

        console.log('pipelines do banco:', pipelinesData, 'erro:', pError);
        console.log('Stages do banco:', stagesData);

        const defaultPipelines: Pipeline[] = [
          { id: 'e167f4e8-4a19-4ab7-b655-f104004f8bf4', name: 'Vendas Comercial', stages: AGENCY_PIPELINE_STAGES.map((s, i) => ({ ...s, color: 'blue', position: i, status: s.status || FunnelStatus.INTERMEDIATE })) },
          { id: '6262f0d6-8e20-496b-8076-f24e31e67fab', name: 'Gestão de Reuniões', stages: [
            { id: 's1', name: 'Agendadas', color: 'blue', position: 0, status: FunnelStatus.INITIAL },
            { id: 's2', name: 'Confirmadas', color: 'blue', position: 1, status: FunnelStatus.INTERMEDIATE },
            { id: 's3', name: 'Realizadas', color: 'blue', position: 2, status: FunnelStatus.WON }
          ]}
        ];

        if (!pipelinesData || pipelinesData.length === 0) {
          // Seed default pipelines if empty
          const toInsert = [
            { id: 'e167f4e8-4a19-4ab7-b655-f104004f8bf4', name: 'Vendas Comercial', workspace_id: user?.workspace_id || null, position: 0 },
            { id: '6262f0d6-8e20-496b-8076-f24e31e67fab', name: 'Gestão de Reuniões', workspace_id: user?.workspace_id || null, position: 1 }
          ];
          const { data: seededPipelines, error: insertError } = await supabase.from('m4_pipelines').insert(toInsert).select();
          
          if (seededPipelines && seededPipelines.length > 0) {
            pipelinesData = seededPipelines;
            // Seed default stages
            const p1 = seededPipelines.find(p => p.name === 'Vendas Comercial');
            if (p1) {
              const p1Stages = AGENCY_PIPELINE_STAGES.map((s, i) => ({
                pipeline_id: p1.id,
                name: s.name,
                position: i,
                color: 'blue',
                status: s.status
              }));
              await supabase.from('m4_pipeline_stages').insert(p1Stages);
            }
            const p2 = seededPipelines.find(p => p.name === 'Gestão de Reuniões');
            if (p2) {
              const p2Stages = [
                { pipeline_id: p2.id, name: 'Agendadas', position: 0, color: 'blue', status: 'inicial' },
                { pipeline_id: p2.id, name: 'Confirmadas', position: 1, color: 'blue', status: 'intermediario' },
                { pipeline_id: p2.id, name: 'Realizadas', position: 2, color: 'blue', status: 'ganho' }
              ];
              await supabase.from('m4_pipeline_stages').insert(p2Stages);
            }
            // Re-fetch stages to get UUIDs
            const { data: newStagesData } = await supabase.from('m4_pipeline_stages').select('*').order('position');
            stagesData = newStagesData;
          } else {
            console.error("Erro ao semear pipelines:", insertError);
            // Fallback if seeding fails
            setPipelines(defaultPipelines);
            setActivePipelineId('e167f4e8-4a19-4ab7-b655-f104004f8bf4');
          }
        }

        if (pipelinesData && pipelinesData.length > 0) {
          const fullPipelines = pipelinesData.map(p => ({
            ...p,
            stages: (stagesData || []).filter(s => s.pipeline_id === p.id)
          }));
          
          // If a pipeline has NO stages, give it defaults
          const sanitizedPipelines = fullPipelines.map(p => {
            if (p.stages.length === 0) {
              if (p.name === 'Vendas Comercial') {
                return { ...p, stages: AGENCY_PIPELINE_STAGES.map((s, i) => ({ ...s, color: 'blue', position: i, status: s.status || FunnelStatus.INTERMEDIATE })) };
              }
              if (p.name === 'Gestão de Reuniões') {
                return { ...p, stages: [
                  { id: 's1', name: 'Agendadas', color: 'blue', position: 0, status: FunnelStatus.INITIAL },
                  { id: 's2', name: 'Confirmadas', color: 'blue', position: 1, status: FunnelStatus.INTERMEDIATE },
                  { id: 's3', name: 'Realizadas', color: 'blue', position: 2, status: FunnelStatus.WON }
                ]};
              }
            }
            return p;
          });

          setPipelines(sanitizedPipelines);
          if (sanitizedPipelines.length > 0) {
            setActivePipelineId(sanitizedPipelines[0].id);
          }
        } else if (!pipelinesData || pipelinesData.length === 0) {
          // Final fallback if everything fails
          setPipelines(defaultPipelines);
          setActivePipelineId('e167f4e8-4a19-4ab7-b655-f104004f8bf4');
        }

      } catch (err: any) {
        console.error("Erro na conexão Supabase:", err);
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('m4_crm_user_id');
    setCurrentUser(null);
  };

  const handleResetConfig = () => {
    if (window.confirm('Tem certeza que deseja reconfigurar a conexão? Isso limpará as credenciais do Supabase salvas localmente.')) {
      localStorage.removeItem('supabase_url');
      localStorage.removeItem('supabase_anon_key');
      localStorage.removeItem('m4_crm_user_id');
      window.location.reload();
    }
  };

  const handleStatusChange = async (leadId: string, status: 'won' | 'lost' | 'active', extraData?: any) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const { error } = await supabase
      .from('m4_leads')
      .update({ status })
      .eq('id', leadId);

    if (!error) {
      setLeads(leads.map(l => l.id === leadId ? { ...l, status } : l));
      
      // AUTOMATION: If won, create client account and initial transaction
      if (status === 'won') {
        const clientAccData = {
          lead_id: lead.id,
          status: 'active',
          service_type: extraData?.service_type || lead.service_type || 'Fee Mensal',
          start_date: extraData?.start_date || new Date().toISOString().split('T')[0],
          monthly_value: extraData?.monthly_value || lead.proposed_ticket || lead.value || 0,
          notes: `Conta criada automaticamente a partir do lead ${lead.name}`,
          ...(currentUser?.workspace_id ? { workspace_id: currentUser.workspace_id } : {})
        };

        const { data: accRes, error: accErr } = await supabase
          .from('m4_client_accounts')
          .insert([clientAccData])
          .select();

        if (!accErr && accRes) {
          setClientAccounts([...clientAccounts, accRes[0]]);

          // Create initial transaction
          const initialTrans = {
            description: `Primeira Mensalidade - ${lead.company}`,
            amount: clientAccData.monthly_value,
            type: 'Receita',
            category: 'Mensalidade',
            status: 'Pendente',
            due_date: clientAccData.start_date,
            client_account_id: accRes[0].id,
            lead_id: lead.id,
            payment_method: 'Boleto',
            ...(currentUser?.workspace_id ? { workspace_id: currentUser.workspace_id } : {})
          };

          const { data: transRes } = await supabase
            .from('m4_transactions')
            .insert([initialTrans])
            .select();
          
          if (transRes) setTransactions([...transactions, ...transRes]);

          // Also create the legacy "Client" and "Project" for backward compatibility if needed
          const clientData = {
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            status: 'active',
            mrr: clientAccData.monthly_value,
            contract_start: clientAccData.start_date,
            health_score: 100,
            ...(currentUser?.workspace_id ? { workspace_id: currentUser.workspace_id } : {})
          };

          const { data: clientRes } = await supabase
            .from('m4_clients')
            .insert([clientData])
            .select();

          if (clientRes) {
            setClients([...clients, clientRes[0]]);
            
            const projectData = {
              name: `Onboarding: ${lead.company}`,
              client_id: clientRes[0].id,
              lead_id: lead.id,
              status: 'active',
              start_date: clientAccData.start_date,
              value: lead.value || 0,
              ...(currentUser?.workspace_id ? { workspace_id: currentUser.workspace_id } : {})
            };

            const { data: projRes } = await supabase
              .from('m4_projects')
              .insert([projectData])
              .select();

            if (projRes) {
              setProjects([...projects, projRes[0]]);
              
              // Create standard onboarding tasks
              const onboardingTasks = [
                { title: 'Enviar Contrato', type: 'task', priority: 'Urgente', status: 'Pendente', client_account_id: accRes[0].id },
                { title: 'Enviar Briefing', type: 'task', priority: 'Alta', status: 'Pendente', client_account_id: accRes[0].id },
                { title: 'Criar Grupo WhatsApp', type: 'task', priority: 'Média', status: 'Pendente', client_account_id: accRes[0].id },
                { title: 'Agendar Kickoff', type: 'meeting', priority: 'Alta', status: 'Pendente', client_account_id: accRes[0].id }
              ].map(t => ({
                ...t,
                project_id: projRes[0].id,
                due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                created_at: new Date().toISOString(),
                ...(currentUser?.workspace_id ? { workspace_id: currentUser.workspace_id } : {})
              }));

              const { data: tasksRes } = await supabase
                .from('m4_tasks')
                .insert(onboardingTasks)
                .select();
              
              if (tasksRes) setTasks([...tasks, ...tasksRes]);
            }
          }
        }
      } else if (status === 'lost') {
        // AUTOMATION: If lost, create a follow-up task
        const followUpTask = {
          title: `Follow-up: Lead Perdido - ${lead.company}`,
          description: `Motivo da perda: ${extraData?.reason || 'Não informado'}. Tentar contato em 3 meses.`,
          type: 'call',
          priority: 'Baixa',
          status: 'Pendente',
          lead_id: lead.id,
          company_id: lead.company_id,
          due_date: new Date(Date.now() + 90 * 86400000).toISOString(), // 90 days
          created_at: new Date().toISOString(),
          ...(currentUser?.workspace_id ? { workspace_id: currentUser.workspace_id } : {})
        };

        const { data: taskRes } = await supabase
          .from('m4_tasks')
          .insert([followUpTask])
          .select();
        
        if (taskRes) setTasks([...tasks, ...taskRes]);
      }
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
            : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'
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
      title: "Comercial",
      items: [
        { id: 'sales', icon: ICONS.Sales, label: 'Pipelines Vendas', hasSubItems: true, menuKey: 'sales', overviewId: 'sales_overview' },
        { id: 'clients_group', icon: ICONS.Clients, label: 'Base de Clientes', hasSubItems: true, menuKey: 'clients', overviewId: 'clients_overview' },
        { id: 'meeting_forms', icon: ICONS.Form, label: 'Sondagem & Reunião' },
        { id: 'client_accounts', icon: ICONS.Clients, label: 'Contas Ativas' },
      ]
    },
    {
      title: "Financeiro",
      items: [
        { id: 'finance', icon: ICONS.Finance, label: 'Gestão Financeira' },
      ]
    },
    {
      title: "Operacional",
      items: [
        { id: 'tasks', icon: ICONS.Tasks, label: 'Minhas Tarefas' },
        { id: 'projects', icon: ICONS.Projects, label: 'Projetos & Squads' },
      ]
    },
    ...(appMode === AppMode.AGENCIA ? [{
      title: "Agência Plus",
      items: [
        { id: 'emails', icon: ICONS.Mail, label: 'E-mail (Inbox)' },
        { id: 'enrichment', icon: ICONS.Database, label: 'Importar Leads' },
        { id: 'marketing', icon: ICONS.Marketing, label: 'Marketing CRM' },
        { id: 'contact', icon: ICONS.ContactCenter, label: 'Contact Center' },
        { id: 'automation', icon: ICONS.Automation, label: 'IA & Automações' },
        { id: 'collaboration', icon: ICONS.Collaboration, label: 'Feed & Chat' },
      ]
    }] : [])
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
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-24'} bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 transition-all duration-500 flex flex-col z-30 shadow-2xl shadow-slate-200/20 dark:shadow-none`}>
        <div className="p-8 flex items-center gap-4 border-b border-slate-50 dark:border-slate-800 h-24 shrink-0">
          <div className="w-11 h-11 bg-gradient-to-tr from-blue-700 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-100 overflow-hidden">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              'M4'
            )}
          </div>
          <div className={`transition-all duration-500 ${!isSidebarOpen ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
            <h1 className="font-black text-slate-900 dark:text-white text-xl leading-none">{settings?.crm_name || 'M4 CRM'}</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] font-black text-blue-600 uppercase">{settings?.company_name || 'Agency Cloud'}</p>
              <button 
                onClick={() => setAppMode(appMode === AppMode.EUGENCIA ? AppMode.AGENCIA : AppMode.EUGENCIA)}
                className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[8px] font-black hover:bg-blue-100 hover:text-blue-600 transition-colors"
              >
                {appMode === AppMode.EUGENCIA ? 'EUGÊNCIA' : 'AGÊNCIA'}
              </button>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto scrollbar-none">
          <SidebarItem id="dashboard" icon={ICONS.Dashboard} label="Visão Geral" isActive={activeTab === 'dashboard'} />
          
          {menuSections.map((section, sIdx) => (
            <React.Fragment key={sIdx}>
              <div className={`pt-8 pb-3 px-6 text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] transition-opacity ${!isSidebarOpen && 'opacity-0'}`}>
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
                  
                  {item.id === 'sales' && expandedMenus.sales && isSidebarOpen && (
                    <div className="ml-10 space-y-1 mt-2 animate-in slide-in-from-top-4 duration-300">
                      <button
                        onClick={() => setActiveTab('sales_overview')}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${
                          activeTab === 'sales_overview'
                            ? 'text-blue-600 bg-blue-50/50' 
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
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
                              ? 'text-blue-600 bg-blue-50/50' 
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'sales' && activePipelineId === p.id ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {item.id === 'clients_group' && expandedMenus.clients && isSidebarOpen && (
                    <div className="ml-10 space-y-1 mt-2 animate-in slide-in-from-top-4 duration-300">
                      <button onClick={() => setActiveTab('clients_overview')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'clients_overview' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'clients_overview' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                        Visão Geral
                      </button>
                      <button onClick={() => setActiveTab('companies')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'companies' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'companies' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                        Empresas
                      </button>
                      <button onClick={() => setActiveTab('contacts')} className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'contacts' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'contacts' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                        Contatos
                      </button>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </React.Fragment>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-50 dark:border-slate-800">
          <SidebarItem id="settings" icon={ICONS.Settings} label="Configurações" isActive={activeTab === 'settings'} />
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="w-full mt-4 flex items-center justify-center p-3 text-slate-300 hover:text-blue-600 rounded-2xl transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`${!isSidebarOpen ? 'rotate-180' : ''}`}><path d="m15 18-6-6 6-6"/></svg>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-10 z-20">
          <div className="flex items-center gap-6 bg-slate-50 dark:bg-slate-800 px-6 py-2.5 rounded-[1.25rem] w-[500px] border border-slate-200/50 dark:border-slate-700/50">
            <ICONS.Search className="text-slate-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Pesquisar em tudo..." className="bg-transparent border-none outline-none text-sm w-full font-bold text-slate-800 dark:text-slate-200" />
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
          {activeTab === 'dashboard' && <Dashboard leads={leads} transactions={transactions} tasks={tasks} />}
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
          {activeTab === 'client_accounts' && <ClientAccounts leads={leads} tasks={tasks} transactions={transactions} clientAccounts={clientAccounts} setClientAccounts={setClientAccounts} companies={companies} services={services} />}
          {activeTab === 'tasks' && <Tasks tasks={tasks} setTasks={setTasks} currentUser={currentUser} />}
          {activeTab === 'finance' && (
            <Finance 
              transactions={transactions} 
              bankAccounts={bankAccounts} 
              creditCards={creditCards} 
              clientAccounts={clientAccounts}
              setTransactions={setTransactions}
              setBankAccounts={setBankAccounts}
              setCreditCards={setCreditCards}
              appMode={appMode}
              currentUser={currentUser}
              financeCategories={financeCategories}
              paymentMethods={paymentMethods}
            />
          )}
          {activeTab === 'marketing' && <MarketingCRM leads={leads} campaigns={campaigns} />}
          {activeTab === 'contact' && <ContactCenter />}
          {activeTab === 'automation' && <Automation leads={leads} />}
          {activeTab === 'settings' && (
            <Settings 
              appMode={appMode} 
              currentUser={currentUser} 
              onUserUpdate={setCurrentUser} 
              services={services} 
              setServices={setServices} 
              fetchServices={fetchServices} 
              financeCategories={financeCategories}
              setFinanceCategories={setFinanceCategories}
              paymentMethods={paymentMethods}
              setPaymentMethods={setPaymentMethods}
              pipelines={pipelines}
              setPipelines={setPipelines}
            />
          )}
        </div>
        
        <div className="px-10 pb-6 flex justify-center">
          <button 
            onClick={handleResetConfig}
            className="text-[10px] font-black text-slate-300 hover:text-slate-500 uppercase tracking-widest transition-colors"
          >
            Reconfigurar conexão
          </button>
        </div>
      </main>
    </div>
  );
};

export default App;
