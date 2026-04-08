
import { Transaction, Lead, Company, Contact, ClientAccount, Task, M4Client, TaskTemplate, WorkspaceNav, Folder, List, CustomFieldDef, CustomFieldValue, M4Automation, TimeTracking } from '../types';

/**
 * 🛡️ WHITELIST MAPPERS
 * These functions ensure only valid database columns are sent to Supabase.
 * They also handle snake_case conversion and data sanitization.
 */

export const mappers = {
  /**
   * TRANSACTION MAPPER
   */
  transaction: (data: Partial<Transaction>, workspaceId?: string) => {
    const payload: any = {
      description: data.description || 'Sem descrição',
      amount: Number(data.amount) || 0,
      type: data.type,
      category: data.category,
      status: data.status,
      date: data.date || new Date().toISOString().split('T')[0],
      due_date: data.due_date || null,
      paid_date: data.paid_date || null,
      bank_account_id: data.bank_account_id || null,
      client_account_id: data.client_account_id || null,
      lead_id: data.lead_id || null,
      company_id: data.company_id || null,
      credit_card_id: data.credit_card_id || null,
      payment_method: data.payment_method || null,
      notes: data.notes || '',
      is_recurring: !!data.is_recurring,
      recurrence_type: data.recurrence_type || null,
      recurrence: data.recurrence || null,
      recurrence_interval: data.recurrence_interval || null,
      recurrence_day_of_month: data.recurrence_day_of_month || null,
      recurrence_day_of_week: data.recurrence_day_of_week || null,
      recurrence_month: data.recurrence_month || null,
      recurrence_unit: data.recurrence_unit || null,
      recurrence_end_date: data.recurrence_end_date || null,
      recurring_id: data.recurring_id || null,
    };

    if (workspaceId || data.workspace_id) payload.workspace_id = workspaceId || data.workspace_id;
    return payload;
  },

  /**
   * LEAD MAPPER
   */
  lead: (data: Partial<Lead>, workspaceId?: string) => {
    const payload: any = {
      name: data.name || 'Contato não informado',
      company: data.company || 'Empresa não informada',
      company_id: data.company_id || null,
      contact_id: data.contact_id || null,
      email: data.email || '',
      phone: data.phone || '',
      pipeline_id: data.pipeline_id || null,
      stage: data.stage || null,
      value: Number(data.value) || 0,
      notes: data.notes || '',
      niche: data.niche || '',
      service_type: data.service_type || '',
      proposed_ticket: Number(data.proposed_ticket) || 0,
      next_action: data.next_action || '',
      next_action_date: data.next_action_date || null,
      qualification: data.qualification || '',
      source: data.source || '',
      campaign: data.campaign || '',
      city: data.city || '',
      state: data.state || '',
      closing_forecast: data.closing_forecast || null,
      temperature: data.temperature || 'Frio',
      probability: Number(data.probability) || 0,
      ai_score: Number(data.ai_score) || 0,
      ai_reasoning: data.ai_reasoning || '',
      legal_name: data.legal_name || '',
      instagram: data.instagram || '',
      website: data.website || '',
      cnpj: data.cnpj || '',
      company_linkedin: data.company_linkedin || '',
      company_whatsapp: data.company_whatsapp || '',
      company_email: data.company_email || '',
      company_phone: data.company_phone || '',
      contact_role: data.contact_role || '',
      contact_whatsapp: data.contact_whatsapp || '',
      contact_instagram: data.contact_instagram || '',
      contact_linkedin: data.contact_linkedin || '',
      responsible_name: data.responsible_name || '',
      responsible_id: data.responsible_id || null,
      status: data.status || 'active',
    };

    if (workspaceId || data.workspace_id) payload.workspace_id = workspaceId || data.workspace_id;
    return payload;
  },

  /**
   * COMPANY MAPPER
   */
  company: (data: Partial<Company>, workspaceId?: string) => {
    const payload: any = {
      name: data.name || 'Sem nome',
      cnpj: data.cnpj || '',
      city: data.city || '',
      state: data.state || '',
      segment: data.segment || '',
      website: data.website || '',
      email: data.email || '',
      instagram: data.instagram || '',
      linkedin: data.linkedin || '',
      phone: data.phone || '',
      whatsapp: data.whatsapp || '',
      notes: data.notes || '',
    };

    if (workspaceId || data.workspace_id) payload.workspace_id = workspaceId || data.workspace_id;
    return payload;
  },

  /**
   * CONTACT MAPPER
   */
  contact: (data: Partial<Contact>, workspaceId?: string) => {
    const payload: any = {
      company_id: data.company_id || null,
      name: data.name || 'Sem nome',
      role: data.role || '',
      email: data.email || '',
      phone: data.phone || '',
      whatsapp: data.whatsapp || '',
      instagram: data.instagram || '',
      linkedin: data.linkedin || '',
      notes: data.notes || '',
      is_primary: !!data.is_primary,
    };

    if (workspaceId || data.workspace_id) payload.workspace_id = workspaceId || data.workspace_id;
    return payload;
  },

  /**
   * CLIENT ACCOUNT MAPPER
   */
  clientAccount: (data: Partial<ClientAccount>, workspaceId?: string) => {
    const payload: any = {
      lead_id: data.lead_id || null,
      company_id: data.company_id || null,
      status: data.status || 'ativo',
      service_type: data.service_type || '',
      start_date: data.start_date || new Date().toISOString().split('T')[0],
      end_date: data.end_date || null,
      billing_model: data.billing_model || 'recorrente',
      monthly_value: Number(data.monthly_value) || 0,
      notes: data.notes || '',
    };

    if (workspaceId || data.workspace_id) payload.workspace_id = workspaceId || data.workspace_id;
    return payload;
  },

  /**
   * TASK MAPPER
   */
  task: (data: Partial<Task>, workspaceId?: string) => {
    const payload: any = {
      title: data.title || 'Sem título',
      description: data.description || '',
      status: data.status || 'Pendente',
      priority: data.priority || 'Média',
      type: data.type || 'task',
      due_date: data.due_date || null,
      assigned_to: data.assigned_to || null,
      tags: data.tags || '',
      lead_id: data.lead_id || data.deal_id || null,
      company_id: data.company_id || null,
      contact_id: data.contact_id || null,
      client_id: data.client_id || null,
      client_account_id: data.client_account_id || null,
      is_recurring: !!data.is_recurring,
      recurrence: data.recurrence || data.recurrence_type || 'none',
      recurrence_pattern: data.recurrence_pattern || {
        days: data.recurrence_days,
        day_of_month: data.recurrence_day_of_month,
        month_week: data.recurrence_month_week,
        occurrences: data.recurrence_occurrences,
        end_date: data.recurrence_end_date
      },
      parent_task_id: data.parent_task_id || null,
      checklist: data.checklist || [],
      dependencies: data.dependencies || [],
      estimated_hours: Number(data.estimated_hours) || 0,
      actual_hours: Number(data.actual_hours) || 0,
      list_id: data.list_id || null,
      task_type: data.task_type || 'operational',
    };

    if (workspaceId || data.workspace_id) payload.workspace_id = workspaceId || data.workspace_id;
    return payload;
  },

  /**
   * CLIENT MAPPER
   */
  client: (data: Partial<M4Client>, workspaceId?: string) => {
    const payload: any = {
      lead_id: data.lead_id || null,
      company_id: data.company_id || null,
      company_name: data.company_name || 'Empresa não informada',
      status: data.status || 'active',
      contract_start_date: data.contract_start_date || null,
      monthly_value: Number(data.monthly_value) || 0,
      services: data.services || [],
      manager_id: data.manager_id || null,
    };

    if (workspaceId || data.workspace_id) payload.workspace_id = workspaceId || data.workspace_id;
    return payload;
  },

  /**
   * TASK TEMPLATE MAPPER
   */
  taskTemplate: (data: Partial<TaskTemplate>, workspaceId?: string) => {
    const payload: any = {
      name: data.name || 'Sem nome',
      trigger_event: data.trigger_event || 'client_onboarding',
      tasks: data.tasks || [],
    };

    if (workspaceId || data.workspace_id) payload.workspace_id = workspaceId || data.workspace_id;
    return payload;
  },

  /**
   * WORKSPACE NAV MAPPER
   */
  workspaceNav: (data: Partial<WorkspaceNav>, workspaceId?: string) => {
    const payload: any = {
      name: data.name || 'Sem nome',
      icon: data.icon || null,
      color: data.color || null,
    };

    if (workspaceId || data.workspace_id) payload.workspace_id = workspaceId || data.workspace_id;
    return payload;
  },

  /**
   * FOLDER MAPPER
   */
  folder: (data: Partial<Folder>, workspaceId?: string) => {
    const payload: any = {
      workspace_nav_id: data.workspace_nav_id,
      name: data.name || 'Sem nome',
    };

    if (workspaceId || data.workspace_id) payload.workspace_id = workspaceId || data.workspace_id;
    return payload;
  },

  /**
   * LIST MAPPER
   */
  list: (data: Partial<List>, workspaceId?: string) => {
    const payload: any = {
      folder_id: data.folder_id || null,
      workspace_nav_id: data.workspace_nav_id || null,
      name: data.name || 'Sem nome',
      view_type: data.view_type || 'kanban',
    };

    if (workspaceId || data.workspace_id) payload.workspace_id = workspaceId || data.workspace_id;
    return payload;
  },

  /**
   * CUSTOM FIELD DEF MAPPER
   */
  customFieldDef: (data: Partial<CustomFieldDef>, workspaceId?: string) => {
    const payload: any = {
      entity_type: data.entity_type,
      field_name: data.field_name,
      field_type: data.field_type,
      options: data.options || [],
    };

    if (workspaceId || data.workspace_id) payload.workspace_id = workspaceId || data.workspace_id;
    return payload;
  },

  /**
   * CUSTOM FIELD VALUE MAPPER
   */
  customFieldValue: (data: Partial<CustomFieldValue>, workspaceId?: string) => {
    const payload: any = {
      custom_field_id: data.custom_field_id,
      entity_id: data.entity_id,
      value: data.value,
    };

    if (workspaceId || data.workspace_id) payload.workspace_id = workspaceId || data.workspace_id;
    return payload;
  },

  /**
   * AUTOMATION MAPPER
   */
  automation: (data: Partial<M4Automation>, workspaceId?: string) => {
    const payload: any = {
      name: data.name || 'Sem nome',
      trigger_type: data.trigger_type,
      trigger_conditions: data.trigger_conditions || {},
      actions: data.actions || [],
      is_active: !!data.is_active,
    };

    if (workspaceId || data.workspace_id) payload.workspace_id = workspaceId || data.workspace_id;
    return payload;
  },

  /**
   * TIME TRACKING MAPPER
   */
  timeTracking: (data: Partial<TimeTracking>, workspaceId?: string) => {
    const payload: any = {
      task_id: data.task_id,
      user_id: data.user_id || null,
      start_time: data.start_time,
      end_time: data.end_time || null,
      duration_minutes: Number(data.duration_minutes) || 0,
    };

    if (workspaceId || data.workspace_id) payload.workspace_id = workspaceId || data.workspace_id;
    return payload;
  }
};
