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
  let errorMessage = 'Ocorreu um erro na plataforma';
  let technicalDetails = '';

  if (error instanceof Error) {
    technicalDetails = error.message;
    if (error.message.includes('row-level security policy')) {
      errorMessage = 'Permissão negada: verifique se você tem acesso a este workspace.';
    } else if (error.message.includes('JWT')) {
      errorMessage = 'Sessão expirada. Por favor, faça login novamente.';
    }
  } else if (typeof error === 'object' && error !== null) {
    const errorObj = error as any;
    technicalDetails = errorObj.message || errorObj.details || JSON.stringify(error);
    if (errorObj.code === '42501') {
      errorMessage = 'Acesso negado no banco de dados.';
    }
  }

  console.error(`[CRMService] ${operationType} failed on ${path}:`, technicalDetails);
  throw new Error(errorMessage);
}

export const crmService = {
  async createProject(project: Partial<any>, workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) throw new Error('Workspace ID obrigatório');
    try {
      const { data, error } = await supabase
        .from('m4_projects')
        .insert([{ ...project, workspace_id: workspaceId }])
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'm4_projects');
    }
  },

  async updateProject(id: string, project: Partial<any>, workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) throw new Error('Workspace ID obrigatório');
    try {
      const { data, error } = await supabase
        .from('m4_projects')
        .update(project)
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'm4_projects');
    }
  },

  async deleteProject(id: string, workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId) || !id) throw new Error('Dados obrigatórios ausentes');
    try {
      const { error } = await supabase
        .from('m4_projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('workspace_id', workspaceId);
      if (error) throw error;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'm4_projects');
    }
  },

  async deleteCompany(id: string, workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId) || !id) throw new Error('Dados obrigatórios ausentes');
    try {
      const { error } = await supabase
        .from('m4_companies')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('workspace_id', workspaceId);
      if (error) throw error;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'm4_companies');
    }
  },

  async deleteContact(id: string, workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId) || !id) throw new Error('Dados obrigatórios ausentes');
    try {
      const { error } = await supabase
        .from('m4_contacts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('workspace_id', workspaceId);
      if (error) throw error;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'm4_contacts');
    }
  },

  async getCompanies(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return [];
    try {
      const { data, error } = await supabase
        .from('m4_companies')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_companies');
      return [];
    }
  },

  async getContacts(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return [];
    try {
      const { data, error } = await supabase
        .from('m4_contacts')
        .select('*, company:m4_companies(id, name)')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
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
      const { data, error } = await supabase
        .from('m4_projects')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) {
        const errorMessage = (error as any).message || '';
        if ((error as any).code === '42P01' || errorMessage.includes('Could not find the table')) {
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

