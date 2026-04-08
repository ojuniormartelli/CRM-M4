
import { supabase } from '../lib/supabase';
import { mappers } from '../lib/mappers';
import { Lead, TaskTemplate } from '../types';
import { addDays } from 'date-fns';

export const automationService = {
  /**
   * Converts a lead to a client and triggers onboarding tasks
   */
  async convertLeadToClient(lead: Lead, workspaceId: string) {
    try {
      // 1. Create Client record
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

      // 2. Fetch Onboarding Template
      const { data: template, error: templateError } = await supabase
        .from('m4_task_templates')
        .select('*')
        .eq('trigger_event', 'client_onboarding')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (templateError) {
        console.error('Error fetching template:', templateError);
      }

      // 3. Create Onboarding Tasks if template exists
      if (template && template.tasks && template.tasks.length > 0) {
        const onboardingTasks = template.tasks.map((t: any) => mappers.task({
          client_id: client.id,
          title: t.title,
          description: t.description || '',
          due_date: addDays(new Date(), t.due_days || 0).toISOString(),
          assigned_to: t.assignee || lead.responsible_id || null,
          status: 'Pendente',
          task_type: 'operational',
          type: 'task',
        }, workspaceId));

        const { error: tasksError } = await supabase
          .from('m4_tasks')
          .insert(onboardingTasks);

        if (tasksError) console.error('Error creating onboarding tasks:', tasksError);
      }

      return client;
    } catch (error) {
      console.error('Error in convertLeadToClient:', error);
      throw error;
    }
  }
};
