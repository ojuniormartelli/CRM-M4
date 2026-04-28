import React, { useState, useEffect } from 'react';
import { User } from './types';
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
  const { workspaceId: resolvedWorkspaceId, loading: workspaceLoading } = useWorkspace();
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
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data: user } = await supabase
        .from('m4_users')
        .select('*, job_role:m4_job_roles(*)')
        .eq('id', authUser.id)
        .maybeSingle();
      if (user) {
        setCurrentUser(user as User);
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

  if (appData.loading || workspaceLoading) {
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
  if (!hasConfig) {
    return <Setup />;
  }

  // Se tem configuração mas não está logado, força Login
  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  // Se está logado mas por algum motivo não resolveu o workspace, tenta mostrar Setup (ou erro)
  if (currentUser && !resolvedWorkspaceId && !workspaceLoading) {
    // Se o usuário está logado mas não há workspace, pode ser erro de sincronização ou primeiro acesso mal sucedido
    return <Setup />;
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
