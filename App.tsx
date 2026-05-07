import React, { useState, useEffect } from 'react';
import { User } from './types';
import { ICONS } from './constants';
import { supabase, getSupabaseConfig } from './lib/supabase';
import Login from './components/Login';
import Setup from './pages/Setup';
import { useTheme } from './ThemeContext';
import { automationService } from './services/automationService';
import { leadService } from './services/leadService';
import { clientService } from './services/clientService';
import { taskService } from './services/taskService';
import { useWorkspace } from './hooks/useWorkspace';
import { useAppData } from './hooks/useAppData';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MainContent from './components/layout/MainContent';

const App: React.FC = () => {
  const { theme } = useTheme();
  const { workspaceId: resolvedWorkspaceId, loading: workspaceLoading, error: workspaceError } = useWorkspace();
  const appData = useAppData(resolvedWorkspaceId, workspaceLoading);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMenus, setExpandedMenus] = useState({
    sales: true,
    clients: true,
    finance: true,
    admin: false
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [activePipelineId, setActivePipelineId] = useState<string>('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);

  const [showConfigError, setShowConfigError] = useState(false);

  // --- PWA INSTALLATION ---
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    (deferredPrompt as any).prompt();
    const { outcome } = await (deferredPrompt as any).userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  // --- AUTH: usa Supabase Auth nativo, sem localStorage manual ---
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authUser) return;
        const { data: user, error: profileError } = await supabase
          .from('m4_users')
          .select('*, job_role:m4_job_roles(*)')
          .eq('id', authUser.id)
          .maybeSingle();
        
        if (profileError) throw profileError;
        if (user) {
          setCurrentUser(user as User);
        }
      } catch (err: any) {
        console.error('Erro ao carregar usuário:', err);
        if (err.message?.includes('fetch') || err.message?.includes('failed')) {
          setShowConfigError(true);
        }
      }
    };
    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      } else if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        loadUser();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- UI: Titulo/Favicon dinamico ---
  useEffect(() => {
    if (appData.settings) {
      if (appData.settings.crm_name) document.title = appData.settings.crm_name;
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (link && appData.settings.logo_url) link.href = appData.settings.logo_url;
    }
  }, [appData.settings]);

  // --- Sync pipeline ativo ---
  useEffect(() => {
    if (
      appData.pipelines.length > 0 &&
      !appData.pipelines.find((p) => p.id === activePipelineId)
    ) {
      setActivePipelineId(appData.pipelines[0].id);
    }
  }, [appData.pipelines]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const handleStatusChange = async (
    leadId: string,
    status: 'won' | 'lost' | 'active',
    extraData?: { reason?: string }
  ) => {
    const lead = appData.leads.find((l) => l.id === leadId);
    if (!lead) return;
    try {
      const workspaceId = resolvedWorkspaceId || '';
      await leadService.updateStatus(leadId, status, workspaceId);
      appData.setLeads(appData.leads.map((l) => (l.id === leadId ? { ...l, status } : l)));
      if (status === 'won') {
        await automationService.convertLeadToClient(lead, workspaceId);
        const clientsData = await clientService.getAll(workspaceId);
        appData.setClients(clientsData);
      } else if (status === 'lost') {
        const followUpTask = {
          title: `Follow-up: Lead Perdido - ${lead.company_id}`,
          description: `Motivo da perda: ${extraData?.reason || 'Nao informado'}`,
          type: 'call' as const,
          priority: 'Baixa',
          status: 'Pendente',
          lead_id: lead.id,
          company_id: lead.company_id,
          due_date: new Date(Date.now() + 90 * 86400000).toISOString(),
        };
        const newTask = await taskService.create(followUpTask, workspaceId);
        appData.setTasks([...appData.tasks, newTask]);
      }
    } catch (err) {
      console.error('Erro ao alterar status do lead:', err);
    }
  };

  // --- GUARDS DE RENDERIZACAO ---

  const config = getSupabaseConfig();
  const hasConfig = config.url && config.url !== 'https://placeholder.supabase.co';

  if (showConfigError || workspaceError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 p-12 text-center space-y-6">
        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-[2rem] flex items-center justify-center">
          <ICONS.AlertTriangle size={40} />
        </div>
        <div className="max-w-md space-y-2">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Falha na Conexão</h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            O aplicativo não conseguiu se conectar ao Supabase. Verifique sua conexão com a internet ou se a URL/Key configuradas estão corretas.
          </p>
          {workspaceError && (
            <p className="text-[10px] font-mono text-rose-500 mt-4 p-4 bg-rose-50 rounded-xl overflow-auto w-full">
              {workspaceError.message}
            </p>
          )}
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95"
          >
            Tentar Novamente
          </button>
          <button 
            onClick={() => {
              localStorage.removeItem('supabase_url');
              localStorage.removeItem('supabase_anon_key');
              window.location.reload();
            }}
            className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
          >
            Resetar Configuração
          </button>
        </div>
      </div>
    );
  }

  if (workspaceLoading && !resolvedWorkspaceId) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-950 flex-col gap-4 transition-colors duration-300">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-slate-400 uppercase tracking-widest text-[10px] animate-pulse">
          Iniciando Cloud M4...
        </p>
      </div>
    );
  }

  // Se não tem configuração de Supabase (URL/Key), força Setup
  if (!hasConfig && !workspaceLoading) {
    return <Setup />;
  }

  // Se tem configuração mas não está logado, força Login
  if (!currentUser && !workspaceLoading) {
    return <Login onLogin={setCurrentUser} />;
  }

  // Se está logado mas por algum motivo não resolveu o workspace, tenta mostrar Setup (ou erro)
  if (currentUser && !resolvedWorkspaceId && !workspaceLoading) {
    return <Setup />;
  }

  // Mostrar loading moderado se temos usuário mas ainda estamos buscando os dados iniciais do app
  if (currentUser && resolvedWorkspaceId && appData.loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-950 flex-col gap-4 transition-colors duration-300">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-slate-400 uppercase tracking-widest text-[10px] animate-pulse">
          Carregando seu Espaço de Trabalho...
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${
        theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'
      }`}
    >
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSidebarOpen={isSidebarOpen}
        setSidebarOpen={setSidebarOpen}
        expandedMenus={expandedMenus}
        setExpandedMenus={setExpandedMenus}
        currentUser={currentUser}
        settings={appData.settings}
        deferredPrompt={deferredPrompt}
        handleInstallClick={handleInstallClick}
        pipelines={appData.pipelines}
        activePipelineId={activePipelineId}
        setActivePipelineId={setActivePipelineId}
      />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          currentUser={currentUser}
          handleLogout={handleLogout}
          setActiveTab={setActiveTab}
        />
        <MainContent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          leads={appData.leads}
          setLeads={appData.setLeads}
          transactions={appData.transactions}
          tasks={appData.tasks}
          setTasks={appData.setTasks}
          pipelines={appData.pipelines}
          setPipelines={appData.setPipelines}
          currentUser={currentUser}
          companies={appData.companies}
          setCompanies={appData.setCompanies}
          contacts={appData.contacts}
          setContacts={appData.setContacts}
          emails={appData.emails}
          setEmails={appData.setEmails}
          clients={appData.clients}
          setClients={appData.setClients}
          projects={appData.projects}
          setProjects={appData.setProjects}
          clientAccounts={appData.clientAccounts}
          setClientAccounts={appData.setClientAccounts}
          services={appData.services}
          setServices={appData.setServices}
          bankAccounts={appData.bankAccounts}
          fetchLeads={() => appData.fetchLeads()}
          fetchServices={appData.fetchServices}
          handleStatusChange={handleStatusChange}
          activePipelineId={activePipelineId}
          setActivePipelineId={setActivePipelineId}
          showNewLeadModal={showNewLeadModal}
          setShowNewLeadModal={setShowNewLeadModal}
          showNewCompanyModal={showNewCompanyModal}
          setShowNewCompanyModal={setShowNewCompanyModal}
          showNewContactModal={showNewContactModal}
          setShowNewContactModal={setShowNewContactModal}
          settings={appData.settings}
          setSettings={appData.setSettings}
          setCurrentUser={setCurrentUser}
          resolvedWorkspaceId={resolvedWorkspaceId}
          posts={appData.posts}
          campaigns={appData.campaigns}
        />
      </main>
    </div>
  );
};

export default App;
