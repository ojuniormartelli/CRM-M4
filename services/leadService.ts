import { supabase } from '../lib/supabase';
import { mappers, isUUID } from '../lib/mappers';
import { Lead } from '../types';
import { automationService } from './automationService';

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
  
  console.error('Lead Service Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const leadService = {
  async getAll(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return [];

    try {
      const { data, error } = await supabase
        .from('m4_leads')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mappers.leadFromDb);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_leads');
      return [];
    }
  },

  async create(lead: Partial<Lead>, workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) throw new Error('Workspace ID obrigatório para criar lead');
    const payload = mappers.lead(lead, workspaceId);

    try {
      const { data, error } = await supabase
        .from('m4_leads')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      const createdLead = mappers.leadFromDb(data);

      automationService.processEvent(workspaceId, 'lead', 'lead_created', {
        pipeline_id: createdLead.pipeline_id
      }, createdLead);

      return createdLead;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'm4_leads');
      throw error;
    }
  },

  async update(id: string, lead: Partial<Lead>, workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) throw new Error('Workspace ID obrigatório para atualizar lead');
    try {
      const { data: currentLead, error: fetchError } = await supabase
        .from('m4_leads')
        .select('*')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const payload = mappers.lead(lead);

      const { data, error } = await supabase
        .from('m4_leads')
        .update(payload)
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .select()
        .single();

      if (error) throw error;

      const updatedLead = mappers.leadFromDb(data);

      if (currentLead) {
        if (lead.pipeline_id || lead.stage_id) {
          automationService.processEvent(workspaceId, 'lead', 'stage_change', {
            pipeline_id: updatedLead.pipeline_id,
            from_stage_id: currentLead.stage_id,
            to_stage_id: updatedLead.stage_id
          }, updatedLead);
        }

        if (lead.status && lead.status !== currentLead.status) {
          automationService.processEvent(workspaceId, 'lead', 'status_change', {
            from_status: currentLead.status,
            to_status: updatedLead.status,
            pipeline_id: updatedLead.pipeline_id
          }, updatedLead);
        }

        if (lead.responsible_id && lead.responsible_id !== currentLead.responsible_id) {
          automationService.processEvent(workspaceId, 'lead', 'responsible_change', {
            from_responsible_id: currentLead.responsible_id,
            to_responsible_id: updatedLead.responsible_id,
            pipeline_id: updatedLead.pipeline_id
          }, updatedLead);
        }

        const changedFields = Object.keys(payload).filter(key => payload[key] !== currentLead[key]);
        for (const field of changedFields) {
          automationService.processEvent(workspaceId, 'lead', 'field_update', {
            field,
            from_value: currentLead[field],
            to_value: updatedLead[field]
          }, updatedLead);
        }
      }

      return updatedLead;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'm4_leads');
      throw error;
    }
  },

  async updateStatus(id: string, status: string, workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) throw new Error('Workspace ID obrigatório para atualizar status');
    try {
      const { data: currentLead, error: fetchError } = await supabase
        .from('m4_leads')
        .select('status, workspace_id')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('m4_leads')
        .update({ status })
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .select()
        .single();

      if (error) throw error;

      const updatedLead = mappers.leadFromDb(data);

      if (currentLead && status !== currentLead.status) {
        automationService.processEvent(workspaceId, 'lead', 'status_change', {
          from_status: currentLead.status,
          to_status: status,
          pipeline_id: updatedLead.pipeline_id
        }, updatedLead);
      }

      return updatedLead;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'm4_leads');
      throw error;
    }
  },

  async delete(id: string, workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) throw new Error('Workspace ID obrigatório para excluir lead');
    try {
      const { error } = await supabase
        .from('m4_leads')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspaceId);

      if (error) throw error;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'm4_leads');
      throw error;
    }
  },
};
