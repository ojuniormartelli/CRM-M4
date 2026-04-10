import {
  Transaction,
  Lead,
  Company,
  Contact,
  ClientAccount,
  Task,
  M4Client,
  TaskTemplate,
  WorkspaceNav,
  Folder,
  List,
  CustomFieldDef,
  CustomFieldValue,
  M4Automation,
  TimeTracking,
} from '../types';

/**
 * 🛡️ WHITELIST MAPPERS
 * These functions ensure only valid database columns are sent to Supabase.
 * They also handle snake_case conversion and data sanitization.
 */

const cleanDigits = (val: any) => (val ? String(val).replace(/\D/g, '') : '');

const cleanText = (val: any) => (val == null ? '' : String(val).trim());

const toNumberOrDefault = (val: any, fallback = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

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
    const cleanedCnpj = cleanDigits(data.company_cnpj || data.cnpj);
    const cleanedMainPhone = cleanDigits(data.contact_phone || data.phone || data.company_phone);
    const cleanedMainWhatsapp = cleanDigits(data.whatsapp || data.contact_whatsapp || data.company_whatsapp);

    const cleanedCompanyPhone = cleanDigits(data.company_phone);
    const cleanedCompanyWhatsapp = cleanDigits(data.company_whatsapp);
    const cleanedContactPhone = cleanDigits(data.contact_phone || data.phone);
    const cleanedContactWhatsapp = cleanDigits(data.contact_whatsapp);

    const payload: any = {
      // Core identity in DB
      company: cleanText(data.company_name || data.company) || 'Empresa não informada',
      name: cleanText(data.contact_name || data.name) || 'Contato não informado',
      email: cleanText(data.contact_email || data.email || data.company_email),
      phone: cleanedMainPhone,
      whatsapp: cleanedMainWhatsapp,

      // Company data
      company_id: data.company_id || null,
      cnpj: cleanedCnpj,
      legal_name: cleanText(data.company_name || data.company),
      city: cleanText(data.company_city || data.city),
      state: cleanText(data.company_state || data.state),
      niche: cleanText(data.company_niche || data.niche),
      website: cleanText(data.company_website || data.website),
      instagram: cleanText(data.company_instagram || data.instagram),
      company_email: cleanText(data.company_email),
      company_phone: cleanedCompanyPhone,
      company_whatsapp: cleanedCompanyWhatsapp,
      company_linkedin: cleanText(data.company_linkedin),

      // Contact data
      contact_id: data.contact_id || null,
      contact_role: cleanText(data.contact_role),
      contact_whatsapp: cleanedContactWhatsapp,
      contact_instagram: cleanText(data.contact_instagram),
      contact_linkedin: cleanText(data.contact_linkedin || data.linkedin),
      contact_notes: cleanText(data.contact_notes),

      // Business data
      pipeline_id: data.pipeline_id || null,
      stage: data.stage || null,
      value: toNumberOrDefault(data.value, 0),
      notes: cleanText(data.business_notes || data.notes),
      service_type: cleanText(data.service_type),
      proposed_ticket: toNumberOrDefault(data.proposed_ticket, 0),
      next_action: cleanText(data.next_action),
      next_action_date: data.next_action_date || null,
      qualification: cleanText(data.qualification),
      source: cleanText(data.source),
      campaign: cleanText(data.campaign),
      closing_forecast: data.closing_forecast || null,
      temperature: data.temperature || 'Frio',
      probability: toNumberOrDefault(data.probability, 0),
      ai_score: toNumberOrDefault(data.ai_score, 0),
      ai_reasoning: cleanText(data.ai_reasoning),

      // Metadata & system
      responsible_name: cleanText(data.responsible_name),
      responsible_id: data.responsible_id || null,
      status: data.status || 'active',
      interactions: data.interactions || [],
      custom_fields: data.custom_fields || {},
    };

    if (workspaceId || data.workspace_id) {
      payload.workspace_id = workspaceId || data.workspace_id;
    }

    const REAL_COLUMNS = [
      'id',
      'name',
      'company',
      'company_id',
      'contact_id',
      'email',
      'phone',
      'pipeline_id',
      'stage',
      'value',
      'notes',
      'niche',
      'service_type',
      'proposed_ticket',
      'next_action',
      'next_action_date',
      'qualification',
      'source',
      'campaign',
      'city',
      'state',
      'closing_forecast',
      'temperature',
      'probability',
      'ai_score',
      'ai_reasoning',
      'legal_name',
      'instagram',
      'website',
      'company_email',
      'company_phone',
      'contacts',
      'responsible_name',
      'responsible_id',
      'last_activity_at',
      'status',
      'interactions',
      'custom_fields',
      'workspace_id',
      'created_at',
      'cnpj',
      'whatsapp',
      'company_whatsapp',
      'contact_role',
      'contact_whatsapp',
      'contact_instagram',
      'contact_linkedin',
      'company_linkedin',
      'contact_notes',
    ];

    const finalPayload: any = {};
    REAL_COLUMNS.forEach((col) => {
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
      id: dbLead.id,
      workspace_id: dbLead.workspace_id || '',

      // Prospect Company Data
      company_name: dbLead.company || '',
      company_cnpj: dbLead.cnpj || '',
      company_city: dbLead.city || '',
      company_state: dbLead.state || '',
      company_niche: dbLead.niche || '',
      company_website: dbLead.website || '',
      company_email: dbLead.company_email || '',
      company_instagram: dbLead.instagram || '',
      company_linkedin: dbLead.company_linkedin || '',
      company_phone: dbLead.company_phone || '',

      // Contact / Decision Maker Data
      contact_name: dbLead.name || '',
      contact_role: dbLead.contact_role || '',
      contact_email: dbLead.email || '',
      contact_instagram: dbLead.contact_instagram || '',
      contact_linkedin: dbLead.contact_linkedin || '',
      contact_phone: dbLead.phone || '',
      contact_notes: dbLead.contact_notes || '',

      // Business Data
      pipeline_id: dbLead.pipeline_id || undefined,
      stage: dbLead.stage || '',
      value: Number(dbLead.value) || 0,
      business_notes: dbLead.notes || '',
      service_type: dbLead.service_type || '',
      whatsapp: dbLead.whatsapp || '',
      linkedin: dbLead.contact_linkedin || dbLead.company_linkedin || '',
      company_whatsapp: dbLead.company_whatsapp || '',
      contact_whatsapp: dbLead.contact_whatsapp || '',
      proposed_ticket: Number(dbLead.proposed_ticket) || 0,
      next_action: dbLead.next_action || '',
      next_action_date: dbLead.next_action_date || undefined,
      qualification: dbLead.qualification || '',
      source: dbLead.source || '',
      campaign: dbLead.campaign || '',
      closing_forecast: dbLead.closing_forecast || undefined,
      temperature: dbLead.temperature || 'Frio',
      probability: Number(dbLead.probability) || 0,
      ai_score: Number(dbLead.ai_score) || 0,
      ai_reasoning: dbLead.ai_reasoning || '',

      // Metadata & System
      responsible_name: dbLead.responsible_name || '',
      responsible_id: dbLead.responsible_id || undefined,
      company_id: dbLead.company_id || undefined,
      contact_id: dbLead.contact_id || undefined,
      last_activity_at: dbLead.last_activity_at || undefined,
      status: dbLead.status || 'active',
      interactions: Array.isArray(dbLead.interactions) ? dbLead.interactions : [],
      custom_fields: dbLead.custom_fields && typeof dbLead.custom_fields === 'object' ? dbLead.custom_fields : {},
      created_at: dbLead.created_at || new Date().toISOString(),

      // Legacy / compatibility
      name: dbLead.name || '',
      company: dbLead.company || '',
      email: dbLead.email || '',
      phone: dbLead.phone || '',
      notes: dbLead.notes || '',
      cnpj: dbLead.cnpj || '',
      website: dbLead.website || '',
      niche: dbLead.niche || '',
      city: dbLead.city || '',
      state: dbLead.state || '',
      instagram: dbLead.instagram || '',
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
  },
};