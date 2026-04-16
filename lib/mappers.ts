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
  Automation,
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

export const isUUID = (uuid: any) => {
  if (typeof uuid !== 'string') return false;
  const cleanUuid = uuid.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanUuid);
};

const getValidWorkspaceId = (workspaceId?: string, dataWorkspaceId?: string) => {
  if (workspaceId && isUUID(workspaceId)) return workspaceId;
  if (dataWorkspaceId && isUUID(dataWorkspaceId)) return dataWorkspaceId;
  return null;
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

    const finalWorkspaceId = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (finalWorkspaceId) payload.workspace_id = finalWorkspaceId;
    
    return payload;
  },

  /**
   * LEAD MAPPER
   * 🛡️ STRICT WHITELIST: Only real columns from m4_leads table.
   */
  lead: (data: Partial<Lead>, workspaceId?: string, isUpdate: boolean = false) => {
    const payload: any = {};

    // Helper to check if any source key exists in the input data
    const has = (...keys: string[]) => keys.some(k => k in data);

    // 🛡️ IDENTITY & CORE DATA
    if (has('company_name', 'company')) {
      payload.company = cleanText(data.company_name || data.company) || (isUpdate ? undefined : 'Empresa não informada');
      payload.legal_name = cleanText(data.company_name || data.company);
    } else if (!isUpdate) {
      payload.company = 'Empresa não informada';
    }

    if (has('contact_name', 'name')) {
      payload.name = cleanText(data.contact_name || data.name) || (isUpdate ? undefined : 'Contato não informado');
    } else if (!isUpdate) {
      payload.name = 'Contato não informado';
    }

    if (has('contact_email', 'email', 'company_email')) {
      payload.email = cleanText(data.contact_email || data.email || data.company_email);
    }

    // Phones & Whatsapp
    if (has('contact_phone', 'phone', 'company_phone')) {
      payload.phone = cleanDigits(data.contact_phone || data.phone || data.company_phone);
    }
    if (has('whatsapp', 'contact_whatsapp', 'company_whatsapp')) {
      payload.whatsapp = cleanDigits(data.whatsapp || data.contact_whatsapp || data.company_whatsapp);
    }

    // 🛡️ COMPANY DATA
    if (has('company_id')) payload.company_id = data.company_id || null;
    if (has('company_cnpj', 'cnpj')) payload.cnpj = cleanDigits(data.company_cnpj || data.cnpj);
    if (has('company_city', 'city')) payload.city = cleanText(data.company_city || data.city);
    if (has('company_state', 'state')) payload.state = cleanText(data.company_state || data.state);
    if (has('company_niche', 'niche')) payload.niche = cleanText(data.company_niche || data.niche);
    if (has('company_website', 'website')) payload.website = cleanText(data.company_website || data.website);
    if (has('company_instagram', 'instagram')) payload.instagram = cleanText(data.company_instagram || data.instagram);
    if (has('company_email')) payload.company_email = cleanText(data.company_email);
    if (has('company_phone')) payload.company_phone = cleanDigits(data.company_phone);
    if (has('company_whatsapp')) payload.company_whatsapp = cleanDigits(data.company_whatsapp);
    if (has('company_linkedin')) payload.company_linkedin = cleanText(data.company_linkedin);

    // 🛡️ CONTACT DATA
    if (has('contact_id')) payload.contact_id = data.contact_id || null;
    if (has('contact_role')) payload.contact_role = cleanText(data.contact_role);
    if (has('contact_whatsapp')) payload.contact_whatsapp = cleanDigits(data.contact_whatsapp);
    if (has('contact_instagram')) payload.contact_instagram = cleanText(data.contact_instagram);
    if (has('contact_linkedin', 'linkedin')) payload.contact_linkedin = cleanText(data.contact_linkedin || data.linkedin);
    if (has('contact_notes')) payload.contact_notes = cleanText(data.contact_notes);

    // 🛡️ BUSINESS DATA
    if (has('pipeline_id')) payload.pipeline_id = data.pipeline_id || null;
    if (has('stage_id')) payload.stage_id = data.stage_id || null;
    if (has('stage')) payload.stage = data.stage || null;
    if (has('value')) payload.value = toNumberOrDefault(data.value, 0);
    if (has('business_notes', 'notes')) payload.notes = cleanText(data.business_notes || data.notes);
    if (has('service_type')) payload.service_type = cleanText(data.service_type);
    if (has('proposed_ticket')) payload.proposed_ticket = toNumberOrDefault(data.proposed_ticket, 0);
    if (has('next_action')) payload.next_action = cleanText(data.next_action);
    if (has('next_action_date')) payload.next_action_date = data.next_action_date || null;
    if (has('qualification')) payload.qualification = cleanText(data.qualification);
    if (has('source')) payload.source = cleanText(data.source);
    if (has('campaign')) payload.campaign = cleanText(data.campaign);
    if (has('closing_forecast')) payload.closing_forecast = data.closing_forecast || null;
    if (has('temperature')) payload.temperature = data.temperature || 'Frio';
    if (has('probability')) payload.probability = toNumberOrDefault(data.probability, 0);
    if (has('ai_score')) payload.ai_score = toNumberOrDefault(data.ai_score, 0);
    if (has('ai_reasoning')) payload.ai_reasoning = cleanText(data.ai_reasoning);

    // 🛡️ METADATA & SYSTEM
    const finalWorkspaceId = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (finalWorkspaceId) {
      payload.workspace_id = finalWorkspaceId;
    }

    // 🛡️ STRICT WHITELIST: Only real columns from m4_leads table.
    // REMOVED: 'linkedin', 'company_name', 'contact_email', 'contact_phone', 'business_notes'
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
      'deleted_at',
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
      stage_id: dbLead.stage_id || undefined,
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
      deleted_at: data.deleted_at || null,
    };

    const finalWorkspaceId = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (finalWorkspaceId) payload.workspace_id = finalWorkspaceId;
    
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

    const finalWorkspaceId = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (finalWorkspaceId) payload.workspace_id = finalWorkspaceId;
    
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

    const finalWorkspaceId = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (finalWorkspaceId) payload.workspace_id = finalWorkspaceId;
    
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

    const finalWorkspaceId = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (finalWorkspaceId) payload.workspace_id = finalWorkspaceId;
    
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

    const finalWorkspaceId = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (finalWorkspaceId) payload.workspace_id = finalWorkspaceId;
    
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

    const finalWorkspaceId = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (finalWorkspaceId) payload.workspace_id = finalWorkspaceId;
    
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

    const finalWorkspaceId = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (finalWorkspaceId) payload.workspace_id = finalWorkspaceId;
    
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

    const finalWorkspaceId = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (finalWorkspaceId) payload.workspace_id = finalWorkspaceId;
    
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

    const finalWorkspaceId = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (finalWorkspaceId) payload.workspace_id = finalWorkspaceId;
    
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

    const finalWorkspaceId = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (finalWorkspaceId) payload.workspace_id = finalWorkspaceId;
    
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

    const finalWorkspaceId = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (finalWorkspaceId) payload.workspace_id = finalWorkspaceId;
    
    return payload;
  },

  /**
   * AUTOMATION MAPPER
   */
  automation: (data: Partial<Automation>, workspaceId?: string, isUpdate: boolean = false) => {
    const payload: any = {};
    
    if (data.name !== undefined) payload.name = data.name || (isUpdate ? undefined : 'Sem nome');
    if (data.entity_type !== undefined) payload.entity_type = data.entity_type;
    if (data.trigger_type !== undefined) payload.trigger_type = data.trigger_type;
    if (data.trigger_conditions !== undefined) payload.trigger_conditions = data.trigger_conditions || [];
    if (data.actions !== undefined) payload.actions = data.actions || [];
    if (data.is_active !== undefined) payload.is_active = !!data.is_active;
    else if (!isUpdate) payload.is_active = true;

    const finalWorkspaceId = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (finalWorkspaceId) payload.workspace_id = finalWorkspaceId;
    
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

    const finalWorkspaceId = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (finalWorkspaceId) payload.workspace_id = finalWorkspaceId;
    
    return payload;
  },
};