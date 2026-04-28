import { useEffect } from 'react';
import { leadService } from '../services/leadService';
import { taskService } from '../services/taskService';
import { financeService } from '../services/financeService';
import { crmService } from '../services/crmService';
import { clientService } from '../services/clientService';
import { useCRMStore } from '../lib/store';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const queryKeys = {
  all: (wsId: string) => [wsId],
  leads: (wsId: string) => ['leads', wsId],
  tasks: (wsId: string) => ['tasks', wsId],
  transactions: (wsId: string) => ['transactions', wsId],
  companies: (wsId: string) => ['companies', wsId],
  contacts: (wsId: string) => ['contacts', wsId],
  emails: (wsId: string) => ['emails', wsId],
  projects: (wsId: string) => ['projects', wsId],
  clients: (wsId: string) => ['clients', wsId],
  clientAccounts: (wsId: string) => ['clientAccounts', wsId],
  services: (wsId: string) => ['services', wsId],
  bankAccounts: (wsId: string) => ['bankAccounts', wsId],
  creditCards: (wsId: string) => ['creditCards', wsId],
  financeCategories: (wsId: string) => ['financeCategories', wsId],
  paymentMethods: (wsId: string) => ['paymentMethods', wsId],
  posts: (wsId: string) => ['posts', wsId],
  campaigns: (wsId: string) => ['campaigns', wsId],
  pipelines: (wsId: string) => ['pipelines', wsId],
  settings: (wsId: string) => ['settings', wsId],
};

export const useAppData = (resolvedWorkspaceId: string | null, workspaceLoading: boolean) => {
  const { setIsLoadingLeads } = useCRMStore();
  const queryClient = useQueryClient();
  
  const enabled = !!resolvedWorkspaceId && !workspaceLoading;
  const wsId = resolvedWorkspaceId || '';

  // 1. Leads
  const { data: leads = [], isLoading: leadsLoading, refetch: fetchLeads } = useQuery({
    queryKey: queryKeys.leads(wsId),
    queryFn: () => leadService.getAll(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 2. Tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: queryKeys.tasks(wsId),
    queryFn: () => taskService.getAll(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 3. Transactions
  const { data: transactions = [] } = useQuery({
    queryKey: queryKeys.transactions(wsId),
    queryFn: () => financeService.getTransactions(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 4. Companies
  const { data: companies = [] } = useQuery({
    queryKey: queryKeys.companies(wsId),
    queryFn: () => financeService.getCompanies(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 5. Contacts
  const { data: contacts = [] } = useQuery({
    queryKey: queryKeys.contacts(wsId),
    queryFn: () => crmService.getContacts(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 6. Emails
  const { data: emails = [] } = useQuery({
    queryKey: queryKeys.emails(wsId),
    queryFn: () => crmService.getEmails(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 7. Projects
  const { data: projects = [] } = useQuery({
    queryKey: queryKeys.projects(wsId),
    queryFn: () => crmService.getProjects(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 8. Clients
  const { data: clients = [] } = useQuery({
    queryKey: queryKeys.clients(wsId),
    queryFn: () => clientService.getAll(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 9. Client Accounts
  const { data: clientAccounts = [] } = useQuery({
    queryKey: queryKeys.clientAccounts(wsId),
    queryFn: () => financeService.getClientAccounts(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 10. Services
  const { data: services = [] } = useQuery({
    queryKey: queryKeys.services(wsId),
    queryFn: () => crmService.getServices(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 11. Bank Accounts
  const { data: bankAccounts = [] } = useQuery({
    queryKey: queryKeys.bankAccounts(wsId),
    queryFn: () => financeService.getBankAccounts(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 12. Credit Cards
  const { data: creditCards = [] } = useQuery({
    queryKey: queryKeys.creditCards(wsId),
    queryFn: () => financeService.getCreditCards(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 13. Finance Categories
  const { data: financeCategories = [] } = useQuery({
    queryKey: queryKeys.financeCategories(wsId),
    queryFn: () => financeService.getCategories(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 14. Payment Methods
  const { data: paymentMethods = [] } = useQuery({
    queryKey: queryKeys.paymentMethods(wsId),
    queryFn: () => financeService.getPaymentMethods(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 15. Posts
  const { data: posts = [] } = useQuery({
    queryKey: queryKeys.posts(wsId),
    queryFn: () => crmService.getPosts(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 16. Campaigns
  const { data: campaigns = [] } = useQuery({
    queryKey: queryKeys.campaigns(wsId),
    queryFn: () => crmService.getCampaigns(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 17. Pipelines
  const { data: pipelines = [] } = useQuery({
    queryKey: queryKeys.pipelines(wsId),
    queryFn: () => crmService.getPipelines(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 18. Settings
  const { data: settings = {
    crm_name: 'M4 CRM',
    company_name: '',
    theme: 'light',
    primary_color: '#2563eb',
    logo_url: '',
    city: '',
    state: '',
    website: '',
    phone: '',
    language: 'pt-BR'
  } } = useQuery({
    queryKey: queryKeys.settings(wsId),
    queryFn: () => crmService.getSettings(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // Sync isLoadingLeads from store with React Query status
  useEffect(() => {
    setIsLoadingLeads(leadsLoading);
  }, [leadsLoading, setIsLoadingLeads]);

  // Listen for automation events to refetch data automatically
  useEffect(() => {
    const handleAutomationExecuted = (e: any) => {
      console.log('[useAppData] Automation executed event received:', e.detail);
      
      // Invalidate all workspace data to ensure consistency on automation changes
      if (wsId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.all(wsId) });
      }
      
      // Specifically invalidate by entity if possible
      if (e.detail?.entityType && wsId) {
        const entityKey = e.detail.entityType + 's';
        if (queryKeys[entityKey as keyof typeof queryKeys]) {
          queryClient.invalidateQueries({ queryKey: (queryKeys[entityKey as keyof typeof queryKeys] as Function)(wsId) });
        }
      }
    };

    window.addEventListener('m4_automation_executed', handleAutomationExecuted);
    return () => window.removeEventListener('m4_automation_executed', handleAutomationExecuted);
  }, [queryClient, wsId]);

  const setLeadsLocally = (newData: any[]) => {
    queryClient.setQueryData(queryKeys.leads(wsId), newData);
  };

  const setTasksLocally = (newData: any[]) => {
    queryClient.setQueryData(queryKeys.tasks(wsId), newData);
  };

  const setCompaniesLocally = (newData: any[]) => {
    queryClient.setQueryData(queryKeys.companies(wsId), newData);
  };

  const setContactsLocally = (newData: any[]) => {
    queryClient.setQueryData(queryKeys.contacts(wsId), newData);
  };

  const setTransactionsLocally = (newData: any[]) => {
    queryClient.setQueryData(queryKeys.transactions(wsId), newData);
  };

  const setBankAccountsLocally = (newData: any[]) => {
    queryClient.setQueryData(queryKeys.bankAccounts(wsId), newData);
  };

  const setCreditCardsLocally = (newData: any[]) => {
    queryClient.setQueryData(queryKeys.creditCards(wsId), newData);
  };

  const setEmailsLocally = (newData: any[]) => {
    queryClient.setQueryData(queryKeys.emails(wsId), newData);
  };

  const setClientsLocally = (newData: any[]) => {
    queryClient.setQueryData(queryKeys.clients(wsId), newData);
  };

  const setProjectsLocally = (newData: any[]) => {
    queryClient.setQueryData(queryKeys.projects(wsId), newData);
  };

  const setClientAccountsLocally = (newData: any[]) => {
    queryClient.setQueryData(queryKeys.clientAccounts(wsId), newData);
  };

  const setServicesLocally = (newData: any[]) => {
    queryClient.setQueryData(queryKeys.services(wsId), newData);
  };

  const setPipelinesLocally = (newData: any[]) => {
    queryClient.setQueryData(queryKeys.pipelines(wsId), newData);
  };

  const setSettingsLocally = (newData: any) => {
    queryClient.setQueryData(queryKeys.settings(wsId), newData);
  };

  const allQueriesLoading = leadsLoading || tasksLoading; // Simplification, could be more exhaustive

  return {
    loading: allQueriesLoading,
    leads, setLeads: setLeadsLocally,
    companies, setCompanies: setCompaniesLocally,
    contacts, setContacts: setContactsLocally,
    tasks, setTasks: setTasksLocally,
    transactions, setTransactions: setTransactionsLocally,
    emails, setEmails: setEmailsLocally,
    clients, setClients: setClientsLocally,
    projects, setProjects: setProjectsLocally,
    clientAccounts, setClientAccounts: setClientAccountsLocally,
    services, setServices: setServicesLocally,
    bankAccounts, setBankAccounts: setBankAccountsLocally,
    creditCards, setCreditCards: setCreditCardsLocally,
    financeCategories,
    paymentMethods,
    posts,
    campaigns,
    pipelines, setPipelines: setPipelinesLocally,
    settings, setSettings: setSettingsLocally,
    fetchLeads,
    fetchServices: () => queryClient.invalidateQueries({ queryKey: queryKeys.services(wsId) })
  };
};
