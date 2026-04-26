import { supabase } from '../lib/supabase';
import { isUUID } from '../lib/mappers';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const workspaceId = localStorage.getItem('m4_crm_workspace_id');
  const userId = localStorage.getItem('m4_crm_user_id');

  let errorMessage = 'Erro desconhecido';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    errorMessage = (error as any).message || (error as any).details || JSON.stringify(error);
  }

  const errInfo = {
    error: errorMessage,
    authInfo: { userId: userId || 'unknown', workspaceId },
    operationType,
    path
  };
  
  console.error('CRM Service Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const crmService = {
  async getContacts(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return [];
    try {
      const { data, error } = await supabase
        .from('m4_contacts')
        .select('*, company:m4_companies(id, name)')
        .eq('workspace_id', workspaceId)
        .order('name');
      if (error) throw error;
      return data || [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_contacts');
      return [];
    }
  },

  async getProjects(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return [];
    try {
      // Check if table exists implicitly by handling error 42P01 (relation does not exist)
      const { data, error } = await supabase
        .from('m4_projects')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      
      if (error) {
        if ((error as any).code === '42P01') {
           console.warn('m4_projects table not found, returning empty array');
           return [];
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_projects');
      return [];
    }
  },

  async getEmails(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return [];
    try {
      const { data, error } = await supabase
        .from('m4_emails')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_emails');
      return [];
    }
  },

  async getPosts(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return [];
    try {
      const { data, error } = await supabase
        .from('m4_posts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_posts');
      return [];
    }
  },

  async getCampaigns(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return [];
    try {
      const { data, error } = await supabase
        .from('m4_campaigns')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_campaigns');
      return [];
    }
  },

  async getServices(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return [];
    try {
      const { data, error } = await supabase
        .from('m4_services')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_services');
      return [];
    }
  },

  async getPipelines(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return [];
    try {
      const { data: pData, error: pError } = await supabase
        .from('m4_pipelines')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('position');
      
      if (pError) throw pError;

      const { data: sData, error: sError } = await supabase
        .from('m4_pipeline_stages')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('position');

      if (sError) throw sError;

      return (pData || []).map(p => ({
        ...p,
        stages: (sData || []).filter(s => s.pipeline_id === p.id)
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_pipelines');
      return [];
    }
  },

  async getSettings(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return null;
    try {
      const { data, error } = await supabase
        .from('m4_settings')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'm4_settings');
      return null;
    }
  }
};

