
import React from 'react';
import { supabase } from '../../lib/supabase';
import { mappers } from '../../lib/mappers';
import Dashboard from '../../pages/Dashboard';
import MyDay from '../../pages/MyDay';
import ClientsOverview from '../../pages/ClientsOverview';
import SalesOverview from '../../pages/SalesOverview';
import EmailModule from '../../pages/EmailModule';
import SalesCRM from '../../pages/SalesCRM';
import Companies from '../../pages/Companies';
import Contacts from '../../pages/Contacts';
import DataEnrichment from '../../pages/DataEnrichment';
import MeetingForms from '../../pages/MeetingForms';
import Collaboration from '../../pages/Collaboration';
import Clients from '../../pages/Clients';
import Projects from '../../pages/Projects';
import ClientAccounts from '../../pages/ClientAccounts';
import Tasks from '../../pages/Tasks';
import Finance from '../../pages/FinanceOrganizador';
import MarketingCRM from '../../pages/MarketingCRM';
import GoalSettings from '../../pages/GoalSettings';
import ContactCenter from '../../pages/ContactCenter';
import Settings from '../../pages/Settings';

interface MainContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  leads: any[];
  setLeads: (leads: any[]) => void;
  transactions: any[];
  tasks: any[];
  setTasks: (tasks: any[]) => void;
  pipelines: any[];
  setPipelines: (pipelines: any[]) => void;
  currentUser: any;
  companies: any[];
  setCompanies: (companies: any[]) => void;
  contacts: any[];
  setContacts: (contacts: any[]) => void;
  emails: any[];
  setEmails: (emails: any[]) => void;
  clients: any[];
  setClients: (clients: any[]) => void;
  projects: any[];
  setProjects: (projects: any[]) => void;
  clientAccounts: any[];
  setClientAccounts: (accounts: any[]) => void;
  services: any[];
  setServices: (services: any[]) => void;
  bankAccounts: any[];
  fetchLeads: (wsId?: string) => any;
  fetchServices: (wsId?: any) => Promise<void>;
  handleStatusChange: (leadId: string, status: any, extraData?: any) => Promise<void>;
  activePipelineId: string;
  setActivePipelineId: (id: string) => void;
  showNewLeadModal: boolean;
  setShowNewLeadModal: (show: boolean) => void;
  showNewCompanyModal: boolean;
  setShowNewCompanyModal: (show: boolean) => void;
  showNewContactModal: boolean;
  setShowNewContactModal: (show: boolean) => void;
  settings: any;
  setSettings: (settings: any) => void;
  setCurrentUser: (user: any) => void;
  resolvedWorkspaceId: string | null;
  posts: any[];
  campaigns: any[];
}

const MainContent: React.FC<MainContentProps> = ({
  activeTab,
  setActiveTab,
  leads,
  setLeads,
  transactions,
  tasks,
  setTasks,
  pipelines,
  setPipelines,
  currentUser,
  companies,
  setCompanies,
  contacts,
  setContacts,
  emails,
  setEmails,
  clients,
  setClients,
  projects,
  setProjects,
  clientAccounts,
  setClientAccounts,
  services,
  setServices,
  bankAccounts,
  fetchLeads,
  fetchServices,
  handleStatusChange,
  activePipelineId,
  setActivePipelineId,
  showNewLeadModal,
  setShowNewLeadModal,
  showNewCompanyModal,
  setShowNewCompanyModal,
  showNewContactModal,
  setShowNewContactModal,
  settings,
  setSettings,
  setCurrentUser,
  resolvedWorkspaceId,
  posts,
  campaigns
}) => {
  return (
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
      {activeTab === 'collaboration' && <Collaboration posts={posts as any} setPosts={posts as any} currentUser={currentUser} />}
      {activeTab === 'clients' && <Clients clients={clients} setClients={setClients} currentUser={currentUser} />}
      {activeTab === 'projects' && <Projects projects={projects} setProjects={setProjects} tasks={tasks} setTasks={setTasks} currentUser={currentUser} />}
      {activeTab === 'client_accounts' && <ClientAccounts leads={leads} tasks={tasks} transactions={transactions} clientAccounts={clientAccounts} setClientAccounts={setClientAccounts} companies={companies} services={services} workspaceId={currentUser?.workspace_id || resolvedWorkspaceId} />}
      {activeTab === 'tasks' && <Tasks tasks={tasks} setTasks={setTasks} currentUser={currentUser} />}
      {(activeTab === 'finance' || activeTab.startsWith('finance_')) && <Finance currentUser={currentUser} activeTab={activeTab} />}
      {activeTab === 'marketing' && <MarketingCRM leads={leads} campaigns={campaigns as any} />}
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
          workspaceId={currentUser?.workspace_id || resolvedWorkspaceId || ''}
        />
      )}
    </div>
  );
};

export default MainContent;
