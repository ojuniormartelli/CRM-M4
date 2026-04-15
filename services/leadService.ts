import { supabase } from '../lib/supabase';
import { mappers } from '../lib/mappers';
import { Lead } from '../types';
import { automationService } from './automationService';

export const leadService = {
  async getAll() {
    console.log('leadService.getAll() called');

    const { data, error } = await supabase
      .from('m4_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('leadService.getAll() error:', error);
      throw error;
    }

    console.log('leadService.getAll() success, leads count:', data?.length);
    return (data || []).map(mappers.leadFromDb);
  },

  async create(lead: Partial<Lead>, workspaceId: string) {
    const payload = mappers.lead(lead, workspaceId);

    const { data, error } = await supabase
      .from('m4_leads')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('leadService.create() error:', error, payload);
      throw error;
    }

    const createdLead = mappers.leadFromDb(data);

    // Trigger automation: lead_created
    automationService.processEvent(workspaceId, 'lead', 'lead_created', {
      pipeline_id: createdLead.pipeline_id
    }, createdLead);

    return createdLead;
  },

  async update(id: string, lead: Partial<Lead>) {
    // 1. Fetch current state for comparison (for triggers like status_change, stage_change)
    const { data: currentLead } = await supabase.from('m4_leads').select('*').eq('id', id).single();
    
    const payload = mappers.lead(lead, undefined, true);

    const { data, error } = await supabase
      .from('m4_leads')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('leadService.update() error:', error, { id, payload });
      throw error;
    }

    const updatedLead = mappers.leadFromDb(data);

    // 2. Trigger automations based on changes
    if (currentLead) {
      const workspaceId = updatedLead.workspace_id;

      // Trigger: stage_change
      if (lead.pipeline_id || lead.stage_id || lead.stage) {
        automationService.processEvent(workspaceId, 'lead', 'stage_change', {
          pipeline_id: updatedLead.pipeline_id,
          from_stage_id: currentLead.stage_id || currentLead.stage,
          to_stage_id: updatedLead.stage_id || updatedLead.stage
        }, updatedLead);
      }

      // Trigger: status_change
      if (lead.status && lead.status !== currentLead.status) {
        automationService.processEvent(workspaceId, 'lead', 'status_change', {
          from_status: currentLead.status,
          to_status: updatedLead.status,
          pipeline_id: updatedLead.pipeline_id
        }, updatedLead);
      }

      // Trigger: responsible_change
      if (lead.responsible_id && lead.responsible_id !== currentLead.responsible_id) {
        automationService.processEvent(workspaceId, 'lead', 'responsible_change', {
          from_responsible_id: currentLead.responsible_id,
          to_responsible_id: updatedLead.responsible_id,
          pipeline_id: updatedLead.pipeline_id
        }, updatedLead);
      }

      // Trigger: field_update (generic)
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
  },

  async updateStatus(id: string, status: string) {
    // Fetch current status for trigger
    const { data: currentLead } = await supabase.from('m4_leads').select('status, workspace_id').eq('id', id).single();

    const { data, error } = await supabase
      .from('m4_leads')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('leadService.updateStatus() error:', error, { id, status });
      throw error;
    }

    const updatedLead = mappers.leadFromDb(data);

    if (currentLead && status !== currentLead.status) {
      automationService.processEvent(currentLead.workspace_id, 'lead', 'status_change', {
        from_status: currentLead.status,
        to_status: status,
        pipeline_id: updatedLead.pipeline_id
      }, updatedLead);
    }

    return updatedLead;
  },

  async delete(id: string) {
    // 1. Manually delete related records that might not have ON DELETE CASCADE
    // This ensures deletion works even if the database schema is missing some cascade constraints
    try {
      // Delete tasks linked via deal_id (some schemas use deal_id instead of lead_id)
      await supabase.from('m4_tasks').delete().eq('deal_id', id);
      
      // Delete transactions (old and new)
      await supabase.from('m4_transactions').delete().eq('lead_id', id);
      await supabase.from('m4_fin_transactions').delete().eq('lead_id', id);
      
      // Delete emails
      await supabase.from('m4_emails').delete().eq('lead_id', id);
    } catch (err) {
      console.warn('Error deleting related records (might not exist):', err);
    }

    // 2. Delete the lead itself
    const { error } = await supabase
      .from('m4_leads')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('leadService.delete() error:', error, { id });
      throw error;
    }
  },
};