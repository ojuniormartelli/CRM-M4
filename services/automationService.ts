
import { supabase } from '../lib/supabase';
import { mappers } from '../lib/mappers';
import { Lead, TaskTemplate, M4Client, Automation } from '../types';
import { addDays } from 'date-fns';

export const automationService = {
  /**
   * List all automations for a workspace
   */
  async list(workspaceId?: string | null) {
    let query = supabase
      .from('m4_automations')
      .select('*');
    
    if (workspaceId && workspaceId !== 'default') {
      query = query.eq('workspace_id', workspaceId);
    } else {
      query = query.is('workspace_id', null);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data as Automation[];
  },

  /**
   * Get a single automation by ID
   */
  async getById(id: string) {
    const { data, error } = await supabase
      .from('m4_automations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Automation;
  },

  /**
   * Create a new automation
   */
  async create(data: Partial<Automation>, workspaceId?: string | null) {
    const payload = mappers.automation(data, workspaceId || undefined);
    
    const { data: automation, error } = await supabase
      .from('m4_automations')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return automation as Automation;
  },

  /**
   * Update an existing automation
   */
  async update(id: string, data: Partial<Automation>) {
    const payload = mappers.automation(data, undefined, true);
    
    // Remove workspace_id from update if it exists to prevent accidental changes
    delete payload.workspace_id;

    const { data: automation, error } = await supabase
      .from('m4_automations')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return automation as Automation;
  },

  /**
   * Delete an automation
   */
  async delete(id: string) {
    const { error } = await supabase
      .from('m4_automations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Toggle automation active status
   */
  async toggleActive(id: string, isActive: boolean) {
    const { data, error } = await supabase
      .from('m4_automations')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Automation;
  },

  /**
   * Move a lead to a different pipeline and stage
   */
  async moveLeadToPipeline(leadId: string, pipelineId: string, stageId: string, automationId?: string) {
    const { data, error } = await supabase
      .from('m4_leads')
      .update({ 
        pipeline_id: pipelineId, 
        stage_id: stageId,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;

    if (automationId && data) {
      await this.logExecution({
        workspace_id: data.workspace_id,
        automation_id: automationId,
        entity_id: leadId,
        entity_type: 'lead',
        action_type: 'move_to_pipeline',
        execution_details: { pipeline_id: pipelineId, stage_id: stageId }
      });
    }

    return data as Lead;
  },

  /**
   * Duplicate a lead to a different pipeline and stage
   */
  async duplicateLeadToPipeline(leadId: string, pipelineId: string, stageId: string, automationId?: string) {
    // 1. Idempotency check: Check if this automation already duplicated this lead to this pipeline/stage
    if (automationId) {
      const { data: existingLog } = await supabase
        .from('m4_automation_logs')
        .select('id')
        .eq('automation_id', automationId)
        .eq('entity_id', leadId)
        .eq('action_type', 'duplicate_to_pipeline')
        .maybeSingle();

      if (existingLog) {
        console.log('Lead already duplicated by this automation:', leadId);
        return null; // Or throw error, but returning null is safer for bulk operations
      }
    }

    // 2. Fetch original lead
    const { data: originalLead, error: fetchError } = await supabase
      .from('m4_leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Prepare new lead payload (copying all relevant data)
    // We remove ID and timestamps to let Supabase generate new ones
    const { id, created_at, updated_at, ...leadData } = originalLead;
    
    const newLeadPayload = {
      ...leadData,
      pipeline_id: pipelineId,
      stage_id: stageId,
      origin_lead_id: leadId, // Link to original
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 3. Insert new lead
    const { data: newLead, error: insertError } = await supabase
      .from('m4_leads')
      .insert(newLeadPayload)
      .select()
      .single();

    if (insertError) throw insertError;

    if (automationId && newLead) {
      await this.logExecution({
        workspace_id: newLead.workspace_id,
        automation_id: automationId,
        entity_id: leadId,
        entity_type: 'lead',
        action_type: 'duplicate_to_pipeline',
        execution_details: { 
          new_lead_id: newLead.id, 
          pipeline_id: pipelineId, 
          stage_id: stageId 
        }
      });
    }

    return newLead as Lead;
  },

  /**
   * Log automation execution
   */
  async logExecution(logData: {
    workspace_id: string;
    automation_id: string;
    entity_id: string;
    entity_type: string;
    action_type: string;
    status?: string;
    error_message?: string;
    execution_details?: any;
  }) {
    const { error } = await supabase
      .from('m4_automation_logs')
      .insert(logData);

    if (error) {
      console.error('Error logging automation execution:', error);
    }
  },

  /**
   * Evaluates if an automation should be triggered for a given event
   */
  evaluateTrigger(automation: Automation, eventData: any): boolean {
    const { trigger_type, trigger_conditions: cond } = automation;

    if (trigger_type === 'stage_change') {
      const { pipeline_id, from_stage_id, to_stage_id } = cond || {};
      const { pipeline_id: e_pipeline, from_stage_id: e_from, to_stage_id: e_to } = eventData;

      if (pipeline_id && pipeline_id !== e_pipeline) return false;
      if (from_stage_id && from_stage_id !== e_from) return false;
      if (to_stage_id && to_stage_id !== e_to) return false;
      
      return true;
    }

    if (trigger_type === 'status_change') {
      const { pipeline_id, from_status, to_status } = cond || {};
      const { pipeline_id: e_pipeline, from_status: e_from, to_status: e_to } = eventData;

      if (pipeline_id && pipeline_id !== e_pipeline) return false;
      if (from_status && from_status !== e_from) return false;
      if (to_status && to_status !== e_to) return false;

      return true;
    }

    if (trigger_type === 'responsible_change') {
      const { pipeline_id, responsible_id } = cond || {};
      const { pipeline_id: e_pipeline, to_responsible_id: e_to } = eventData;

      if (pipeline_id && pipeline_id !== e_pipeline) return false;
      if (responsible_id && responsible_id !== e_to) return false;

      return true;
    }

    if (trigger_type === 'field_update') {
      const { pipeline_id, field, value } = cond || {};
      const { pipeline_id: e_pipeline, field: e_field, to_value: e_to } = eventData;

      if (pipeline_id && pipeline_id !== e_pipeline) return false;
      if (field && field !== e_field) return false;
      if (value !== undefined && value !== e_to) return false;

      return true;
    }

    if (trigger_type === 'lead_created' || trigger_type === 'task_created') {
      const { pipeline_id } = cond || {};
      const { pipeline_id: e_pipeline } = eventData;

      if (pipeline_id && pipeline_id !== e_pipeline) return false;
      
      return true;
    }

    return false;
  },

  /**
   * Process automations for a specific event
   */
  async processEvent(workspaceId: string, entityType: string, triggerType: string, eventData: any, entity: any) {
    try {
      // 1. Fetch active automations for this trigger and entity
      const { data: automations, error } = await supabase
        .from('m4_automations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('entity_type', entityType)
        .eq('trigger_type', triggerType)
        .eq('is_active', true);

      if (error) throw error;
      if (!automations || automations.length === 0) return;

      for (const auto of automations) {
        // 2. Evaluate conditions
        if (this.evaluateTrigger(auto, eventData)) {
          console.log(`Triggering automation: ${auto.name} (${auto.id})`);
          
          // 3. Execute actions
          for (const action of (auto.actions || [])) {
            try {
              await this.executeAction(auto, action, entity, workspaceId);
            } catch (actionErr) {
              console.error(`Error executing action ${action.type} for automation ${auto.id}:`, actionErr);
              await this.logExecution({
                workspace_id: workspaceId,
                automation_id: auto.id,
                entity_id: entity.id,
                entity_type: entityType,
                action_type: action.type,
                status: 'error',
                error_message: actionErr instanceof Error ? actionErr.message : String(actionErr)
              });
            }
          }

          // Update last triggered
          await supabase.from('m4_automations').update({ last_triggered_at: new Date().toISOString() }).eq('id', auto.id);
        }
      }
    } catch (err) {
      console.error('Error in automation engine:', err);
    }
  },

  /**
   * Execute a single automation action
   */
  async executeAction(automation: Automation, action: any, entity: any, workspaceId: string) {
    const { type, config } = action;

    switch (type) {
      case 'move_to_pipeline':
        if (automation.entity_type === 'lead') {
          await this.moveLeadToPipeline(entity.id, config.pipeline_id, config.stage_id, automation.id);
        }
        break;

      case 'duplicate_to_pipeline':
        if (automation.entity_type === 'lead') {
          await this.duplicateLeadToPipeline(entity.id, config.pipeline_id, config.stage_id, automation.id);
        }
        break;

      case 'change_stage':
        if (automation.entity_type === 'lead') {
          await this.moveLeadToPipeline(entity.id, config.pipeline_id, config.stage_id, automation.id);
        }
        break;

      case 'update_field':
        const updatePayload = { [config.field]: config.value };
        const table = automation.entity_type === 'lead' ? 'm4_leads' : 
                      automation.entity_type === 'task' ? 'm4_tasks' : 'm4_clients';
        
        const { error: updateError } = await supabase
          .from(table)
          .update(updatePayload)
          .eq('id', entity.id);

        if (updateError) throw updateError;

        await this.logExecution({
          workspace_id: workspaceId,
          automation_id: automation.id,
          entity_id: entity.id,
          entity_type: automation.entity_type,
          action_type: 'update_field',
          execution_details: updatePayload
        });
        break;

      case 'create_task':
        const taskPayload = mappers.task({
          title: config.title,
          description: config.description || '',
          due_date: addDays(new Date(), config.due_days || 0).toISOString(),
          lead_id: automation.entity_type === 'lead' ? entity.id : undefined,
          client_id: automation.entity_type === 'client' ? entity.id : undefined,
          status: 'Pendente',
          type: 'task'
        }, workspaceId);

        const { error: taskError } = await supabase.from('m4_tasks').insert(taskPayload);
        if (taskError) throw taskError;

        await this.logExecution({
          workspace_id: workspaceId,
          automation_id: automation.id,
          entity_id: entity.id,
          entity_type: automation.entity_type,
          action_type: 'create_task',
          execution_details: { title: config.title }
        });
        break;

      default:
        console.warn(`Action type ${type} not implemented in engine yet.`);
    }
  },

  /**
   * Converts a lead to a client and triggers onboarding tasks
   * IDEMPOTENT: Checks if client already exists for this lead
   */
  async convertLeadToClient(lead: Lead, workspaceId: string) {
    try {
      // 1. Check if client already exists
      const { data: existingClient } = await supabase
        .from('m4_clients')
        .select('id')
        .eq('lead_id', lead.id)
        .maybeSingle();

      if (existingClient) {
        console.log('Client already exists for lead:', lead.id);
        return existingClient as M4Client;
      }

      // 2. Create Client record
      const clientPayload = mappers.client({
        lead_id: lead.id,
        company_id: lead.company_id,
        company_name: lead.company,
        status: 'active',
        contract_start_date: new Date().toISOString().split('T')[0],
        monthly_value: lead.value,
        services: lead.service_type ? [lead.service_type] : [],
        manager_id: lead.responsible_id || null,
      }, workspaceId);

      const { data: client, error: clientError } = await supabase
        .from('m4_clients')
        .insert(clientPayload)
        .select()
        .single();

      if (clientError) throw clientError;

      // 3. Fetch Onboarding Template
      const { data: template, error: templateError } = await supabase
        .from('m4_task_templates')
        .select('*')
        .eq('trigger_event', 'client_onboarding')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (templateError) {
        console.error('Error fetching template:', templateError);
      }

      // 4. Create Onboarding Tasks if template exists
      if (template && template.tasks && template.tasks.length > 0) {
        // Check if onboarding tasks already exist for this client to avoid duplicates
        const { data: existingTasks } = await supabase
          .from('m4_tasks')
          .select('title')
          .eq('client_id', client.id);
        
        const existingTitles = new Set(existingTasks?.map(t => t.title) || []);

        const onboardingTasks = template.tasks
          .filter((t: any) => !existingTitles.has(t.title))
          .map((t: any) => mappers.task({
            client_id: client.id,
            title: t.title,
            description: t.description || '',
            due_date: addDays(new Date(), t.due_days || 0).toISOString(),
            assigned_to: t.assignee || lead.responsible_id || null,
            status: 'Pendente',
            task_type: 'operational',
            type: 'task',
          }, workspaceId));

        if (onboardingTasks.length > 0) {
          const { error: tasksError } = await supabase
            .from('m4_tasks')
            .insert(onboardingTasks);

          if (tasksError) console.error('Error creating onboarding tasks:', tasksError);
        }
      }

      return client as M4Client;
    } catch (error) {
      console.error('Error in convertLeadToClient:', error);
      throw error;
    }
  }
};
