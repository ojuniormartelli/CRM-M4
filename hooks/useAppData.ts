import { useEffect } from 'react';
import { leadService } from '../services/leadService';
import { taskService } from '../services/taskService';
import { financeService } from '../services/financeService';
import { crmService } from '../services/crmService';
import { clientService } from '../services/clientService';
import { useCRMStore } from '../lib/store';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const useAppData = (resolvedWorkspaceId: string | null, workspaceLoading: boolean) => {
  const { setIsLoadingLeads } = useCRMStore();
  const queryClient = useQueryClient();
  
  const enabled = !!resolvedWorkspaceId && !workspaceLoading;
  const wsId = resolvedWorkspaceId || '';

  // 1. Leads
  const { data: leads = [], isLoading: leadsLoading, refetch: fetchLeads } = useQuery({
    queryKey: ['leads', resolvedWorkspaceId],
    queryFn: () => leadService.getAll(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 2. Tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', resolvedWorkspaceId],
    queryFn: () => taskService.getAll(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 3. Transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', resolvedWorkspaceId],
    queryFn: () => financeService.getTransactions(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 4. Companies
  const { data: companies = [] } = useQuery({
    queryKey: ['companies', resolvedWorkspaceId],
    queryFn: () => financeService.getCompanies(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 5. Contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', resolvedWorkspaceId],
    queryFn: () => crmService.getContacts(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 6. Emails
  const { data: emails = [] } = useQuery({
    queryKey: ['emails', resolvedWorkspaceId],
    queryFn: () => crmService.getEmails(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 7. Projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', resolvedWorkspaceId],
    queryFn: () => crmService.getProjects(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 8. Clients
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', resolvedWorkspaceId],
    queryFn: () => clientService.getAll(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 9. Client Accounts
  const { data: clientAccounts = [] } = useQuery({
    queryKey: ['clientAccounts', resolvedWorkspaceId],
    queryFn: () => financeService.getClientAccounts(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 10. Services
  const { data: services = [] } = useQuery({
    queryKey: ['services', resolvedWorkspaceId],
    queryFn: () => crmService.getServices(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 11. Bank Accounts
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bankAccounts', resolvedWorkspaceId],
    queryFn: () => financeService.getBankAccounts(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 12. Credit Cards
  const { data: creditCards = [] } = useQuery({
    queryKey: ['creditCards', resolvedWorkspaceId],
    queryFn: () => financeService.getCreditCards(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 13. Finance Categories
  const { data: financeCategories = [] } = useQuery({
    queryKey: ['financeCategories', resolvedWorkspaceId],
    queryFn: () => financeService.getCategories(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 14. Payment Methods
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['paymentMethods', resolvedWorkspaceId],
    queryFn: () => financeService.getPaymentMethods(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 15. Posts
  const { data: posts = [] } = useQuery({
    queryKey: ['posts', resolvedWorkspaceId],
    queryFn: () => crmService.getPosts(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 16. Campaigns
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns', resolvedWorkspaceId],
    queryFn: () => crmService.getCampaigns(wsId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 17. Pipelines
  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines', resolvedWorkspaceId],
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
    website_url: '',
    whatsapp_number: '',
    language: 'pt-BR'
  } } = useQuery({
    queryKey: ['settings', resolvedWorkspaceId],
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
      queryClient.invalidateQueries({ queryKey: [resolvedWorkspaceId] });
      
      // Specifically invalidate by entity if possible
      if (e.detail?.entityType) {
        queryClient.invalidateQueries({ queryKey: [e.detail.entityType + 's', resolvedWorkspaceId] });
      }
    };

    window.addEventListener('m4_automation_executed', handleAutomationExecuted);
    return () => window.removeEventListener('m4_automation_executed', handleAutomationExecuted);
  }, [queryClient, resolvedWorkspaceId]);

  const setLeadsLocally = (newData: any[]) => {
    queryClient.setQueryData(['leads', resolvedWorkspaceId], newData);
  };

  const setTasksLocally = (newData: any[]) => {
    queryClient.setQueryData(['tasks', resolvedWorkspaceId], newData);
  };

  const setCompaniesLocally = (newData: any[]) => {
    queryClient.setQueryData(['companies', resolvedWorkspaceId], newData);
  };

  const setContactsLocally = (newData: any[]) => {
    queryClient.setQueryData(['contacts', resolvedWorkspaceId], newData);
  };

  const setTransactionsLocally = (newData: any[]) => {
    queryClient.setQueryData(['transactions', resolvedWorkspaceId], newData);
  };

  const setBankAccountsLocally = (newData: any[]) => {
    queryClient.setQueryData(['bankAccounts', resolvedWorkspaceId], newData);
  };

  const setCreditCardsLocally = (newData: any[]) => {
    queryClient.setQueryData(['creditCards', resolvedWorkspaceId], newData);
  };

  const setEmailsLocally = (newData: any[]) => {
    queryClient.setQueryData(['emails', resolvedWorkspaceId], newData);
  };

  const setClientsLocally = (newData: any[]) => {
    queryClient.setQueryData(['clients', resolvedWorkspaceId], newData);
  };

  const setProjectsLocally = (newData: any[]) => {
    queryClient.setQueryData(['projects', resolvedWorkspaceId], newData);
  };

  const setClientAccountsLocally = (newData: any[]) => {
    queryClient.setQueryData(['clientAccounts', resolvedWorkspaceId], newData);
  };

  const setServicesLocally = (newData: any[]) => {
    queryClient.setQueryData(['services', resolvedWorkspaceId], newData);
  };

  const setPipelinesLocally = (newData: any[]) => {
    queryClient.setQueryData(['pipelines', resolvedWorkspaceId], newData);
  };

  const setSettingsLocally = (newData: any) => {
    queryClient.setQueryData(['settings', resolvedWorkspaceId], newData);
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
    fetchServices: () => queryClient.invalidateQueries({ queryKey: ['services', resolvedWorkspaceId] })
  };
};
