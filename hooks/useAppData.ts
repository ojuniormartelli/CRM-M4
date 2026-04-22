
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { leadService } from '../services/leadService';
import { useCRMStore } from '../lib/store';
import { Pipeline, FunnelStatus } from '../types';
import { AGENCY_PIPELINE_STAGES } from '../constants';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const useAppData = (resolvedWorkspaceId: string | null, workspaceLoading: boolean) => {
  const { setIsLoadingLeads } = useCRMStore();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  
  // React Query for Leads
  const { data: leads = [], isLoading: leadsLoading, refetch: fetchLeads } = useQuery({
    queryKey: ['leads', resolvedWorkspaceId],
    queryFn: () => leadService.getAll(resolvedWorkspaceId || ''),
    enabled: !!resolvedWorkspaceId && !workspaceLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const [companies, setCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clientAccounts, setClientAccounts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [financeCategories, setFinanceCategories] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([
    { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Vendas Comercial', stages: AGENCY_PIPELINE_STAGES },
    { id: '6262f0d6-8e20-496b-8076-f24e31e67fab', name: 'Gestão de Reuniões', stages: [
      { id: 'm1', name: 'Agendadas', status: FunnelStatus.INITIAL, position: 0, color: 'blue' }, 
      { id: 'm2', name: 'Confirmadas', status: FunnelStatus.INTERMEDIATE, position: 1, color: 'amber' }, 
      { id: 'm3', name: 'Realizadas', status: FunnelStatus.WON, position: 2, color: 'emerald' }
    ] }
  ]);
  const [settings, setSettings] = useState<any>({
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
  });

  // Sync isLoadingLeads from store with React Query status
  useEffect(() => {
    setIsLoadingLeads(leadsLoading);
  }, [leadsLoading]);

  const fetchServices = async (wsId: string) => {
    try {
      const { data: servicesData, error } = await supabase.from('m4_services').select('*').eq('workspace_id', wsId).order('name');
      if (!error) setServices(servicesData || []);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (workspaceLoading || !resolvedWorkspaceId) {
        if (!workspaceLoading) setLoading(false);
        return;
      }
      
      setLoading(true);
      const wsId = resolvedWorkspaceId;

      const safeFetch = async (tableName: string, setter: (data: any[]) => void, options: any = {}) => {
        try {
          let query = supabase.from(tableName).select(options.select || '*').eq('workspace_id', wsId);
          if (options.isDeleted) query = query.is('deleted_at', null);
          if (options.order) query = query.order(options.order, { ascending: options.ascending ?? true });
          const { data, error } = await query;
          if (!error) setter(data || []);
          else setter([]);
        } catch (err) { setter([]); }
      };

      await Promise.all([
        // fetchLeads(wsId), // Handled by React Query
        safeFetch('m4_tasks', setTasks),
        safeFetch('m4_fin_transactions', setTransactions),
        safeFetch('m4_emails', setEmails, { order: 'created_at', ascending: false }),
        safeFetch('m4_clients', setClients),
        safeFetch('m4_projects', setProjects),
        safeFetch('m4_posts', setPosts, { order: 'created_at', ascending: false }),
        safeFetch('m4_campaigns', setCampaigns, { order: 'created_at', ascending: false }),
        safeFetch('m4_fin_bank_accounts', setBankAccounts),
        safeFetch('m4_credit_cards', setCreditCards),
        safeFetch('m4_fin_categories', setFinanceCategories, { order: 'name' }),
        safeFetch('m4_fin_payment_methods', setPaymentMethods, { order: 'name' }),
        safeFetch('m4_companies', setCompanies, { isDeleted: true, order: 'name' }),
        safeFetch('m4_contacts', setContacts, { select: '*, company:m4_companies(id, name)', order: 'name' }),
        fetchServices(wsId),
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
      }
      
      setLoading(false);
    };

    fetchData();
  }, [resolvedWorkspaceId, workspaceLoading]);

  const setLeadsLocally = (newData: any[]) => {
    // Manually update cache if needed, or queryClient.setQueryData
    queryClient.setQueryData(['leads', resolvedWorkspaceId], newData);
  };

  return {
    loading: loading || leadsLoading,
    leads, setLeads: setLeadsLocally,
    companies, setCompanies,
    contacts, setContacts,
    tasks, setTasks,
    transactions,
    emails, setEmails,
    clients, setClients,
    projects, setProjects,
    clientAccounts, setClientAccounts,
    services, setServices,
    bankAccounts,
    creditCards,
    financeCategories,
    paymentMethods,
    posts,
    campaigns,
    pipelines, setPipelines,
    settings, setSettings,
    fetchLeads,
    fetchServices
  };
};
