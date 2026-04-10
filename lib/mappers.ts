
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
   * 🛡️ STRICT WHITELIST: Only real columns from m4_leads table.
   */
  lead: (data: Partial<Lead>, workspaceId?: string) => {
    // Normalization helpers
    const cleanDigits = (val: any) => val ? String(val).replace(/\D/g, '') : '';
    
    const cleanedCnpj = cleanDigits(data.company_cnpj || data.cnpj);
    const cleanedPhone = cleanDigits(data.contact_phone || data.phone || data.company_phone);
    const cleanedWhatsapp = cleanDigits(data.whatsapp || data.company_whatsapp || data.contact_whatsapp);

    // Build payload using ONLY confirmed real columns
    const payload: any = {
      // Core Identity (Real Columns: company, name, email, phone)
      company: data.company_name || data.company || 'Empresa não informada',
      name: data.contact_name || data.name || 'Contato não informado',
      email: data.contact_email || data.email || data.company_email || '',
      phone: cleanedPhone,
      
      // Additional Info (Real Columns: cnpj, city, state, niche, website, instagram, linkedin, whatsapp)
      cnpj: cleanedCnpj,
      city: data.city || data.company_city || '',
      state: data.state || data.company_state || '',
      niche: data.niche || data.company_niche || '',
      website: data.company_website || data.website || '',
      instagram: data.instagram || data.company_instagram || '',
      linkedin: data.company_linkedin || data.contact_linkedin || data.linkedin || '',
      whatsapp: cleanedWhatsapp,
      
      // Business Data (Real Columns: pipeline_id, stage, value, notes, service_type, proposed_ticket, next_action, next_action_date, qualification, source, campaign, closing_forecast, temperature, probability, ai_score, ai_reasoning)
      pipeline_id: data.pipeline_id || null,
      stage: data.stage || null,
      value: Number(data.value) || 0,
      notes: data.business_notes || data.notes || '',
      service_type: data.service_type || '',
      proposed_ticket: Number(data.proposed_ticket) || 0,
      next_action: data.next_action || '',
      next_action_date: data.next_action_date || null,
      qualification: data.qualification || '',
      source: data.source || '',
      campaign: data.campaign || '',
      closing_forecast: data.closing_forecast || null,
      temperature: data.temperature || 'Frio',
      probability: Number(data.probability) || 0,
      ai_score: Number(data.ai_score) || 0,
      ai_reasoning: data.ai_reasoning || '',
      
      // Metadata & System (Real Columns: responsible_name, responsible_id, company_id, contact_id, status, workspace_id)
      responsible_name: data.responsible_name || '',
      responsible_id: data.responsible_id || null,
      company_id: data.company_id || null,
      contact_id: data.contact_id || null,
      status: data.status || 'active',
    };

    if (data.contact_notes) payload.contact_notes = data.contact_notes;
    if (workspaceId || data.workspace_id) payload.workspace_id = workspaceId || data.workspace_id;
    
    // 🛡️ FINAL WHITELIST FILTER
    // This ensures that even if we accidentally added a key above, it won't be sent if it's not in the real schema.
    const REAL_COLUMNS = [
      'id', 'company', 'name', 'email', 'phone', 'cnpj', 'city', 'state', 'niche', 'website', 'instagram', 'linkedin', 'whatsapp',
      'pipeline_id', 'stage', 'value', 'notes', 'service_type', 'proposed_ticket', 'next_action', 'next_action_date', 
      'qualification', 'source', 'campaign', 'closing_forecast', 'temperature', 'probability', 'ai_score', 'ai_reasoning',
      'responsible_name', 'responsible_id', 'company_id', 'contact_id', 'status', 'workspace_id', 'created_at', 'last_activity_at',
      'interactions', 'custom_fields', 'contact_notes'
    ];

    const finalPayload: any = {};
    REAL_COLUMNS.forEach(col => {
      if (payload[col] !== undefined) {
        finalPayload[col] = payload[col];
      }
    });

    return finalPayload;
  },

  /**
   * REVERSE MAPPER (DB -> UI)
   * Ensures UI compatibility with real DB columns
   */
  leadFromDb: (dbLead: any): Lead => {
    return {
      ...dbLead,
      // Map real columns back to UI interface names
      company_name: dbLead.company || dbLead.company_name || '',
      contact_name: dbLead.name || dbLead.contact_name || '',
      contact_email: dbLead.email || dbLead.contact_email || '',
      contact_phone: dbLead.phone || dbLead.contact_phone || '',
      company_cnpj: dbLead.cnpj || dbLead.company_cnpj || '',
      company_city: dbLead.city || dbLead.company_city || '',
      company_state: dbLead.state || dbLead.company_state || '',
      company_niche: dbLead.niche || dbLead.company_niche || '',
      company_website: dbLead.website || dbLead.company_website || '',
      company_instagram: dbLead.instagram || dbLead.company_instagram || '',
      business_notes: dbLead.notes || dbLead.business_notes || '',
      
      // Ensure legacy fields are also populated for safety
      company: dbLead.company || dbLead.company_name || '',
      name: dbLead.name || dbLead.contact_name || '',
      email: dbLead.email || dbLead.contact_email || '',
      phone: dbLead.phone || dbLead.contact_phone || '',
    } as Lead;
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
      lead_id: data.lead_id || data.deal_id || null,
      company_id: data.company_id || null,
      contact_id: data.contact_id || null,
      deal_id: data.deal_id || data.lead_id || null,
      client_id: data.client_id || null,
      client_account_id: data.client_account_id || null,
      is_recurring: !!data.is_recurring,
      recurrence: data.recurrence || data.recurrence_type || 'none',
      recurrence_pattern: data.recurrence_pattern || {},
      parent_task_id: data.parent_task_id || null,
      checklist: data.checklist || [],
      dependencies: data.dependencies || [],
      estimated_hours: Number(data.estimated_hours) || 0,
      actual_hours: Number(data.actual_hours) || 0,
      list_id: data.list_id || null,
      task_type: data.task_type || 'internal',
      interaction_success: data.interaction_success ?? true,
      interaction_note: data.interaction_note || '',
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
