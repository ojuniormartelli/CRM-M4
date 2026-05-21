import React, { useState, useEffect } from 'react';
import { User } from './types';
import { ICONS } from './constants';
import { supabase, getSupabaseConfig, isSupabaseConfigured, diagnoseSupabaseError } from './lib/supabase';
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
import toast from 'react-hot-toast';

const App: React.FC = () => {
  const { theme } = useTheme();
  
  // High-level initialization flags
  const [authInitialized, setAuthInitialized] = useState(false);
  const bootstrapping = React.useRef(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Guards data hooks until auth state is resolved once
  const { workspaceId: resolvedWorkspaceId, loading: workspaceLoading, error: workspaceError } = useWorkspace(authInitialized);
  const appData = useAppData(resolvedWorkspaceId, workspaceLoading);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (window.innerWidth <= 1024) {
      setSidebarOpen(false);
    }
  }, [activeTab]);

  const handleSetActiveTab = (tab: string) => {
    if (tab === 'menu_toggle') {
      setSidebarOpen(!isSidebarOpen);
      return;
    }
    setActiveTab(tab);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMenus, setExpandedMenus] = useState({
    sales: true,
    clients: true,
    finance: true,
    admin: false
  });
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [activePipelineId, setActivePipelineId] = useState<string>('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);

  const [showConfigError, setShowConfigError] = useState<{ title: string; message: string; type?: string } | null>(null);

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

  // --- AUTH: centralized bootstrap ---
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthInitialized(true);
      return;
    }

    const bootstrapAuth = async (retries = 3, delay = 500) => {
      if (bootstrapping.current && !retries) return;
      bootstrapping.current = true;
      
      console.log(`[App] Starting Auth Bootstrap (Retries left: ${retries})...`);
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          if (authError.message?.includes('Auth session missing')) {
            setAuthInitialized(true);
            return;
          }
          throw authError;
        }
        
        if (authUser) {
          const { data: user, error: profileError } = await supabase
            .from('m4_users')
            .select('*, job_role:m4_job_roles(*)')
            .eq('id', authUser.id)
            .maybeSingle();
          
          if (profileError) throw profileError;
          if (user) setCurrentUser(user as User);
        }
        setAuthInitialized(true);
      } catch (err: any) {
        // Retry logic for network errors
        if (retries > 0 && (err.message?.includes('fetch') || err.message?.includes('CONEXAO_BLOQUEADA'))) {
          console.warn(`[App] Auth bootstrap attempt failed, retrying in ${delay}ms... (Retries left: ${retries})`, err);
          setTimeout(() => bootstrapAuth(retries - 1, delay * 2), delay);
          return;
        }

        const isConnectionIssue = err.message?.includes('fetch') || err.message?.includes('CONEXAO_BLOQUEADA') || err.message?.includes('blocked');
        if (isConnectionIssue) {
          console.warn('[App] Auth bootstrap connection blocked/failed (possible AdBlock or empty config):', err.message);
        } else {
          console.error('[App] Auth bootstrap fully failed after exhausting retries:', err);
        }
        setShowConfigError(diagnoseSupabaseError(err));
        setAuthInitialized(true); // Release guard even on error to show error screen
      } finally {
        bootstrapping.current = false;
        console.log('[App] Auth Bootstrap sequence ended.');
      }
    };

    bootstrapAuth();

    // Listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[App] Auth state change:', event);
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      } else if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        // Re-fetch user profile if signed in or updated
        const fetchProfile = async () => {
          const { data: user } = await supabase
            .from('m4_users')
            .select('*, job_role:m4_job_roles(*)')
            .eq('id', session.user.id)
            .maybeSingle();
          if (user) setCurrentUser(user as User);
        };
        fetchProfile();
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
      
      // Encontra a etapa correspondente no funil para atualizar a coluna visual também
      const pipeline = appData.pipelines.find(p => p.id === lead.pipeline_id) || appData.pipelines[0];
      let targetStageId: string | undefined = undefined;

      if (pipeline && pipeline.stages) {
        if (status === 'lost') {
          const lostStage = pipeline.stages.find(s => 
            s.status?.toLowerCase() === 'lost' || 
            s.status?.toLowerCase() === 'perdido' || 
            s.name?.toLowerCase().includes('perdido') || 
            s.name?.toLowerCase().includes('lost')
          );
          if (lostStage) {
            targetStageId = lostStage.id;
          }
        } else if (status === 'won') {
          const wonStage = pipeline.stages.find(s => 
            s.status?.toLowerCase() === 'won' || 
            s.status?.toLowerCase() === 'ganho' || 
            s.name?.toLowerCase().includes('ganho') || 
            s.name?.toLowerCase().includes('won') || 
            s.name?.toLowerCase().includes('fechamento') || 
            s.name?.toLowerCase().includes('fechado')
          );
          if (wonStage) {
            targetStageId = wonStage.id;
          }
        }
      }

      await leadService.updateStatus(leadId, status, workspaceId, targetStageId);
      appData.setLeads(appData.leads.map((l) => (l.id === leadId ? { 
        ...l, 
        status,
        ...(targetStageId ? { stage_id: targetStageId, stage: targetStageId } : {})
      } : l)));
      if (status === 'won') {
        const updatedLeadWithNewStage = {
          ...lead,
          status,
          ...(targetStageId ? { stage_id: targetStageId, stage: targetStageId } : {})
        };
        await automationService.convertLeadToClient(updatedLeadWithNewStage, workspaceId);
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
    } catch (err: any) {
      console.error('Erro ao alterar status do lead:', err);
      toast.error(err.message || 'Erro ao alterar status do lead');
      throw err;
    }
  };

  // --- GUARDS DE RENDERIZACAO ---

  const config = getSupabaseConfig();
  const hasConfig = config.url && config.url !== 'https://placeholder.supabase.co';

  if (showConfigError || workspaceError) {
    const errorInfo = showConfigError || (workspaceError ? diagnoseSupabaseError(workspaceError) : null);
    
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 p-12 text-center space-y-6">
        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-[2rem] flex items-center justify-center">
          <ICONS.AlertTriangle size={40} />
        </div>
        <div className="max-w-md space-y-2">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            {errorInfo?.title || 'Falha na Conexão'}
          </h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            {errorInfo?.message || 'O aplicativo não conseguiu se conectar ao Supabase. Verifique sua conexão com a internet ou se a URL/Key configuradas estão corretas.'}
          </p>
          
          {errorInfo?.type === 'blocked' && (
            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 rounded-2xl text-left">
              <p className="text-amber-800 dark:text-amber-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                <ICONS.AlertTriangle size={14} /> Dica de Diagnóstico
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-500 leading-relaxed italic">
                Caudado provável: Seu navegador está bloqueando o domínio do Supabase. <br/>
                <b>Solução:</b> Desative extensões de AdBlock (uBlock, AdBlock Plus, etc) para este site e recarregue a página.
              </p>
            </div>
          )}

          {(workspaceError || showConfigError) && (
            <div className="mt-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Erro Detalhado (Developer Trace)</p>
              <pre className="text-[10px] font-mono text-rose-400 p-4 bg-rose-50/50 dark:bg-rose-900/10 rounded-xl overflow-auto w-full max-h-32 text-left">
                {workspaceError?.message || JSON.stringify(showConfigError, null, 2)}
              </pre>
            </div>
          )}
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100 dark:shadow-none"
          >
            <ICONS.RefreshCw size={14} />
            Tentar Novamente
          </button>
          <button 
            onClick={() => {
              localStorage.removeItem('supabase_url');
              localStorage.removeItem('supabase_anon_key');
              window.location.reload();
            }}
            className="flex items-center gap-2 px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            <ICONS.Settings size={14} />
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
        setActiveTab={handleSetActiveTab}
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
          setActiveTab={handleSetActiveTab}
        />
        <MainContent
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
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
