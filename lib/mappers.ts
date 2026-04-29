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
 * 🛡️ STANDARDIZED MAPPERS (Schema v2)
 * All prefixes: m4_
 */

const cleanDigits = (val: any) => (val ? String(val).replace(/\D/g, '') : '');
const cleanText = (val: any) => (val == null ? '' : String(val).trim());
const toNumber = (val: any, fallback = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

export const isUUID = (uuid: any) => {
  if (typeof uuid !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid.trim());
};

const getValidWorkspaceId = (workspaceId?: string, dataWorkspaceId?: string) => {
  if (workspaceId && isUUID(workspaceId)) return workspaceId;
  if (dataWorkspaceId && isUUID(dataWorkspaceId)) return dataWorkspaceId;
  return null;
};

export const mappers = {
  /**
   * LEAD MAPPER
   */
  lead: (data: Partial<Lead>, workspaceId?: string) => {
    const payload: any = {};
    if (data.company_name !== undefined) payload.company_name = cleanText(data.company_name) || 'Sem empresa';
    if (data.company_cnpj !== undefined || (data as any).cnpj !== undefined) {
      payload.company_cnpj = cleanDigits(data.company_cnpj || (data as any).cnpj);
    }
    if (data.company_city !== undefined || (data as any).city !== undefined) {
      payload.company_city = cleanText(data.company_city || (data as any).city);
    }
    if (data.company_state !== undefined || (data as any).state !== undefined) {
      payload.company_state = cleanText(data.company_state || (data as any).state);
    }
    if (data.company_niche !== undefined || (data as any).niche !== undefined) {
      payload.company_niche = cleanText(data.company_niche || (data as any).niche);
    }
    if (data.company_website !== undefined || (data as any).website !== undefined) {
      payload.company_website = cleanText(data.company_website || (data as any).website);
    }
    if (data.company_email !== undefined || (data as any).email !== undefined) {
      payload.company_email = cleanText(data.company_email || (data as any).email);
    }
    if (data.company_instagram !== undefined) payload.company_instagram = cleanText(data.company_instagram);
    if (data.company_linkedin !== undefined) payload.company_linkedin = cleanText(data.company_linkedin);
    if (data.company_whatsapp !== undefined || (data as any).whatsapp !== undefined || (data as any).phone !== undefined) {
      payload.company_whatsapp = cleanDigits(data.company_whatsapp || (data as any).whatsapp || (data as any).phone);
    }
    
    if (data.contact_name !== undefined || (data as any).name !== undefined) {
      payload.contact_name = cleanText(data.contact_name || (data as any).name) || 'Sem nome';
    }
    if (data.contact_role !== undefined) payload.contact_role = cleanText(data.contact_role);
    if (data.contact_email !== undefined) payload.contact_email = cleanText(data.contact_email);
    if (data.contact_instagram !== undefined) payload.contact_instagram = cleanText(data.contact_instagram);
    if (data.contact_linkedin !== undefined) payload.contact_linkedin = cleanText(data.contact_linkedin);
    if (data.contact_whatsapp !== undefined) {
      payload.contact_whatsapp = cleanDigits(data.contact_whatsapp);
    }
    if (data.contact_notes !== undefined) payload.contact_notes = cleanText(data.contact_notes);

    if (data.pipeline_id !== undefined) payload.pipeline_id = data.pipeline_id || null;
    if (data.stage_id !== undefined || (data as any).stage !== undefined) {
      payload.stage_id = data.stage_id || (data as any).stage || null;
    }
    if (data.value !== undefined) payload.value = toNumber(data.value);
    if (data.business_notes !== undefined || (data as any).notes !== undefined) {
      payload.business_notes = cleanText(data.business_notes || (data as any).notes);
    }
    if (data.service_type !== undefined) payload.service_type = cleanText(data.service_type);
    if (data.proposed_ticket !== undefined) payload.proposed_ticket = toNumber(data.proposed_ticket);
    if (data.temperature !== undefined) payload.temperature = data.temperature || 'Frio';
    if (data.probability !== undefined) payload.probability = toNumber(data.probability);
    if (data.source !== undefined) payload.source = cleanText(data.source);
    if (data.campaign !== undefined) payload.campaign = cleanText(data.campaign);
    if (data.closing_forecast !== undefined) payload.closing_forecast = data.closing_forecast || null;
    if (data.next_action !== undefined) payload.next_action = cleanText(data.next_action);
    if (data.next_action_date !== undefined) payload.next_action_date = data.next_action_date || null;
    if (data.qualification !== undefined) payload.qualification = cleanText(data.qualification);
    
    if (data.responsible_id !== undefined) payload.responsible_id = data.responsible_id || null;
    if (data.company_id !== undefined) payload.company_id = data.company_id || null;
    if (data.contact_id !== undefined) payload.contact_id = data.contact_id || null;
    if (data.status !== undefined) payload.status = data.status || 'active';
    if (data.custom_fields !== undefined) payload.custom_fields = data.custom_fields || {};
    if (data.interactions !== undefined) payload.interactions = data.interactions || [];

    const ws = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (ws) payload.workspace_id = ws;
    payload.updated_at = new Date().toISOString();
    return payload;
  },

  leadFromDb: (dbLead: any): Lead => {
    if (!dbLead) return {} as Lead;
    
    // Prioritize joined company name
    const companyName = dbLead.company?.name || dbLead.company_name || 'Sem empresa';
    
    return {
      id: dbLead.id,
      workspace_id: dbLead.workspace_id,
      company_name: companyName,
      company_cnpj: dbLead.company?.cnpj || dbLead.company_cnpj || dbLead.cnpj || '',
      company_city: dbLead.company?.city || dbLead.company_city || dbLead.city || '',
      company_state: dbLead.company?.state || dbLead.company_state || dbLead.state || '',
      company_niche: dbLead.company?.niche || dbLead.company_niche || dbLead.niche || '',
      company_website: dbLead.company?.website || dbLead.company_website || dbLead.website || '',
      company_email: dbLead.company?.email || dbLead.company_email || dbLead.email || '',
      company_instagram: dbLead.company_instagram || '',
      company_linkedin: dbLead.company_linkedin || '',
      company_whatsapp: dbLead.company?.whatsapp || dbLead.company_whatsapp || dbLead.whatsapp || dbLead.phone || '',
      contact_name: dbLead.contact_name || 'Sem nome',
      contact_role: dbLead.contact_role || '',
      contact_email: dbLead.contact_email || dbLead.email || '',
      contact_instagram: dbLead.contact_instagram || '',
      contact_linkedin: dbLead.contact_linkedin || '',
      contact_whatsapp: dbLead.contact_whatsapp || dbLead.whatsapp || dbLead.phone || '',
      contact_notes: dbLead.contact_notes || '',
      pipeline_id: dbLead.pipeline_id || null,
      stage_id: dbLead.stage_id || null,
      stage: dbLead.stage_id || '',
      value: toNumber(dbLead.value),
      business_notes: dbLead.business_notes || dbLead.notes || '',
      service_type: dbLead.service_type || '',
      proposed_ticket: toNumber(dbLead.proposed_ticket),
      temperature: dbLead.temperature || 'Frio',
      probability: toNumber(dbLead.probability),
      source: dbLead.source || '',
      campaign: dbLead.campaign || '',
      closing_forecast: dbLead.closing_forecast || undefined,
      next_action: dbLead.next_action || '',
      next_action_date: dbLead.next_action_date || undefined,
      qualification: dbLead.qualification || '',
      responsible_id: dbLead.responsible_id || undefined,
      company_id: dbLead.company_id || undefined,
      contact_id: dbLead.contact_id || undefined,
      status: dbLead.status || 'active',
      created_at: dbLead.created_at || new Date().toISOString(),
      last_activity_at: dbLead.last_activity_at || undefined,
      interactions: dbLead.interactions || [],
      custom_fields: dbLead.custom_fields || {},
      company: dbLead.company || undefined,
      // Legacy Aliases for UI compatibility
      name: dbLead.contact_name || '',
      email: dbLead.contact_email || dbLead.email || '',
      whatsapp: dbLead.contact_whatsapp || dbLead.whatsapp || dbLead.phone || '',
      notes: dbLead.business_notes || dbLead.notes || '',
      cnpj: dbLead.company_cnpj || dbLead.cnpj || '',
      website: dbLead.company_website || dbLead.website || '',
    } as Lead;
  },

  company: (data: Partial<Company>, workspaceId?: string) => {
    const payload: any = {};
    if (data.name !== undefined) payload.name = cleanText(data.name) || 'Sem nome';
    if (data.cnpj !== undefined) payload.cnpj = cleanDigits(data.cnpj);
    if (data.website !== undefined) payload.website = cleanText(data.website);
    if (data.city !== undefined) payload.city = cleanText(data.city);
    if (data.state !== undefined) payload.state = cleanText(data.state);
    if (data.email !== undefined) payload.email = cleanText(data.email);
    if (data.whatsapp !== undefined) payload.whatsapp = cleanDigits(data.whatsapp);
    if (data.notes !== undefined) payload.notes = cleanText(data.notes);

    const ws = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (ws) payload.workspace_id = ws;
    return payload;
  },

  contact: (data: Partial<Contact>, workspaceId?: string) => {
    const payload: any = {};
    if (data.name !== undefined) payload.name = cleanText(data.name) || 'Sem nome';
    if (data.company_id !== undefined) payload.company_id = data.company_id;
    if (data.email !== undefined) payload.email = cleanText(data.email);
    if (data.role !== undefined) payload.role = cleanText(data.role);
    if (data.whatsapp !== undefined) payload.whatsapp = cleanDigits(data.whatsapp);
    if (data.notes !== undefined) payload.notes = cleanText(data.notes);
    if (data.is_primary !== undefined) payload.is_primary = !!data.is_primary;
    if (data.linkedin !== undefined) payload.linkedin = cleanText((data as any).linkedin);

    const ws = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (ws) payload.workspace_id = ws;
    return payload;
  },

  transaction: (data: Partial<Transaction>, workspaceId?: string) => {
    const payload: any = {};
    if (data.description !== undefined) payload.description = cleanText(data.description) || 'Sem descrição';
    if (data.amount !== undefined) payload.amount = toNumber(data.amount);
    if (data.type !== undefined) payload.type = data.type;
    
    // UUID Fields - Convert empty string to null
    if (data.category_id !== undefined) payload.category_id = isUUID(data.category_id) ? data.category_id : null;
    if (data.bank_account_id !== undefined) payload.bank_account_id = isUUID(data.bank_account_id) ? data.bank_account_id : null;
    if ((data as any).destination_bank_account_id !== undefined) payload.destination_bank_account_id = isUUID((data as any).destination_bank_account_id) ? (data as any).destination_bank_account_id : null;
    if ((data as any).parent_transaction_id !== undefined) payload.parent_transaction_id = isUUID((data as any).parent_transaction_id) ? (data as any).parent_transaction_id : null;
    if ((data as any).client_account_id !== undefined) payload.client_account_id = isUUID((data as any).client_account_id) ? (data as any).client_account_id : null;
    if ((data as any).lead_id !== undefined) payload.lead_id = isUUID((data as any).lead_id) ? (data as any).lead_id : null;
    if ((data as any).company_id !== undefined) payload.company_id = isUUID((data as any).company_id) ? (data as any).company_id : null;
    if ((data as any).cost_center_id !== undefined) payload.cost_center_id = isUUID((data as any).cost_center_id) ? (data as any).cost_center_id : null;
    if ((data as any).created_by !== undefined) payload.created_by = isUUID((data as any).created_by) ? (data as any).created_by : null;
    if ((data as any).updated_by !== undefined) payload.updated_by = isUUID((data as any).updated_by) ? (data as any).updated_by : null;

    if (data.status !== undefined) payload.status = data.status || 'pending';
    if (data.issue_date !== undefined) payload.issue_date = data.issue_date;
    if (data.due_date !== undefined) payload.due_date = data.due_date;
    if (data.paid_at !== undefined) payload.paid_at = data.paid_at;
    if (data.notes !== undefined) payload.notes = cleanText(data.notes);
    if ((data as any).edit_history !== undefined) payload.edit_history = (data as any).edit_history;
    if ((data as any).updated_at !== undefined) payload.updated_at = (data as any).updated_at || new Date().toISOString();
    if ((data as any).paid_date !== undefined) payload.paid_date = (data as any).paid_date;
    if ((data as any).competence_date !== undefined) payload.competence_date = (data as any).competence_date;
    if ((data as any).payment_method !== undefined) payload.payment_method = cleanText((data as any).payment_method);

    const ws = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (ws) payload.workspace_id = ws;
    return payload;
  },

  task: (data: Partial<Task>, workspaceId?: string) => {
    const payload: any = {};
    if (data.title !== undefined) payload.title = cleanText(data.title) || 'Sem título';
    if (data.description !== undefined) payload.description = cleanText(data.description);
    if (data.status !== undefined) payload.status = data.status || 'Pendente';
    if (data.priority !== undefined) payload.priority = data.priority || 'Média';
    if (data.due_date !== undefined) payload.due_date = data.due_date || null;
    if (data.lead_id !== undefined) payload.lead_id = data.lead_id || null;
    if (data.client_id !== undefined) payload.client_id = data.client_id || null;
    if ((data as any).company_id !== undefined) payload.company_id = (data as any).company_id || null;
    if ((data as any).assigned_to !== undefined || (data as any).responsible_id !== undefined) {
      payload.assigned_to = (data as any).assigned_to || (data as any).responsible_id || null;
    }

    const ws = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (ws) payload.workspace_id = ws;
    return payload;
  },

  client: (data: Partial<M4Client>, workspaceId?: string) => {
    const payload: any = {};
    if (data.lead_id !== undefined) payload.lead_id = data.lead_id || null;
    if (data.company_id !== undefined) payload.company_id = data.company_id || null;
    if (data.company_name !== undefined) payload.company_name = cleanText(data.company_name);
    if (data.status !== undefined) payload.status = data.status || 'active';
    if (data.contract_start_date !== undefined) payload.contract_start_date = data.contract_start_date;
    if (data.monthly_value !== undefined) payload.monthly_value = toNumber(data.monthly_value);
    if (data.manager_id !== undefined) payload.manager_id = data.manager_id;
    if (data.services !== undefined) payload.services = data.services || [];

    const ws = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (ws) payload.workspace_id = ws;
    return payload;
  },

  automation: (data: Partial<Automation>, workspaceId?: string) => {
    const payload: any = {};
    if (data.name !== undefined) payload.name = cleanText(data.name) || 'Sem nome';
    if (data.entity_type !== undefined) payload.entity_type = data.entity_type;
    if (data.trigger_type !== undefined) payload.trigger_type = data.trigger_type;
    if (data.trigger_conditions !== undefined) payload.trigger_conditions = data.trigger_conditions || {};
    if (data.actions !== undefined) payload.actions = data.actions || [];
    if (data.is_active !== undefined) payload.is_active = !!data.is_active;

    const ws = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (ws) payload.workspace_id = ws;
    return payload;
  },

  bankAccount: (data: any, workspaceId?: string) => {
    const payload: any = {};
    if (data.name !== undefined) payload.name = cleanText(data.name) || 'Sem nome';
    if (data.bank !== undefined) payload.bank = cleanText(data.bank);
    if (data.type !== undefined) payload.type = data.type || 'checking';
    if (data.initial_balance !== undefined) payload.initial_balance = toNumber(data.initial_balance);
    if (data.initial_balance_date !== undefined) payload.initial_balance_date = data.initial_balance_date;
    if (data.currency !== undefined) payload.currency = data.currency || 'BRL';
    if (data.is_active !== undefined) payload.is_active = !!data.is_active;
    
    // Core balance fields
    if (data.balance !== undefined) payload.balance = toNumber(data.balance);
    else if (data.initial_balance !== undefined) payload.balance = toNumber(data.initial_balance);
    
    if (data.current_balance !== undefined) payload.current_balance = toNumber(data.current_balance);
    else if (payload.balance !== undefined) payload.current_balance = payload.balance;

    if (data.color !== undefined) payload.color = data.color;
    if (data.icon !== undefined) payload.icon = data.icon;

    const ws = getValidWorkspaceId(workspaceId, data.workspace_id);
    if (ws) payload.workspace_id = ws;
    return payload;
  }
};
