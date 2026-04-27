
import React, { useState, useEffect } from 'react';
import { User } from './types';
import { supabase } from './lib/supabase';
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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [activePipelineId, setActivePipelineId] = useState<string>('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  
  // Modal states
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);

  // --- PWA INSTALLATION ---
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  // Auth & User Handling
  useEffect(() => {
    const checkUser = async () => {
      const localUserId = localStorage.getItem('m4_crm_user_id');
      const localWorkspaceId = localStorage.getItem('m4_crm_workspace_id');
      
      if (!localUserId) return;

      const { data: user } = await supabase
        .from('m4_users')
        .select('*, job_role:m4_job_roles(*)')
        .eq('id', localUserId)
        .maybeSingle();

      if (user) {
        setCurrentUser({ ...user, workspace_id: user.workspace_id || resolvedWorkspaceId || localWorkspaceId || '' });
      } else {
        localStorage.removeItem('m4_crm_user_id');
      }
    };
    checkUser();
  }, [resolvedWorkspaceId]);

  // UI Updates (Title/Favicon)
  useEffect(() => {
    if (appData.settings) {
      if (appData?.settings?.crm_name) document.title = appData.settings.crm_name;
      const link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (link && appData?.settings?.logo_url) link.href = appData.settings.logo_url;
    }
  }, [appData.settings]);

  // Sync active pipeline
  useEffect(() => {
    if (appData.pipelines.length > 0 && !appData.pipelines.find(p => p.id === activePipelineId)) {
      setActivePipelineId(appData.pipelines[0].id);
    }
  }, [appData.pipelines]);

  const handleLogout = async () => {
    localStorage.removeItem('m4_crm_user_id');
    localStorage.removeItem('m4_crm_workspace_id');
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const handleStatusChange = async (leadId: string, status: 'won' | 'lost' | 'active', extraData?: any) => {
    const lead = appData.leads.find(l => l.id === leadId);
    if (!lead) return;

    try {
      const workspaceId = currentUser?.workspace_id || resolvedWorkspaceId || '';
      await leadService.updateStatus(leadId, status, workspaceId);
      appData.setLeads(appData.leads.map(l => l.id === leadId ? { ...l, status } : l));

      if (status === 'won') {
        await automationService.convertLeadToClient(lead, workspaceId);
        const clientsData = await clientService.getAll(workspaceId);
        appData.setClients(clientsData);
      } else if (status === 'lost') {
        const followUpTask = {
          title: `Follow-up: Lead Perdido - ${lead.company}`,
          description: `Motivo da perda: ${extraData?.reason || 'Não informado'}`,
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
      console.error('Error in status change:', err);
    }
  };

  if (appData.loading || workspaceLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-950 flex-col gap-4 transition-colors duration-300">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-slate-400 uppercase tracking-widest text-[10px] animate-pulse">Iniciando Cloud M4...</p>
      </div>
    );
  }

  if (!supabase.auth) return <Setup />; // Fallback check
  if (!currentUser) return <Login onLogin={setCurrentUser} />;

  if (currentUser && !resolvedWorkspaceId) {
    return <Setup />;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans transition-colors duration-300">
      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        expandedMenus={expandedMenus}
        setExpandedMenus={setExpandedMenus}
        pipelines={appData.pipelines}
        setActivePipelineId={setActivePipelineId}
        activePipelineId={activePipelineId}
        settings={appData.settings}
        currentUser={currentUser}
        deferredPrompt={deferredPrompt}
        handleInstallClick={handleInstallClick}
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
          fetchServices={() => appData.fetchServices()}
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
