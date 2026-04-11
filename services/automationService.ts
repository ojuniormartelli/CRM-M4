
import { supabase } from '../lib/supabase';
import { mappers } from '../lib/mappers';
import { Lead, TaskTemplate, M4Client, Automation } from '../types';
import { addDays } from 'date-fns';

export const automationService = {
  /**
   * List all automations for a workspace
   */
  async list(workspaceId: string) {
    const { data, error } = await supabase
      .from('m4_automations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

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
  async create(data: Partial<Automation>, workspaceId: string) {
    const payload = mappers.automation(data, workspaceId);
    
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
