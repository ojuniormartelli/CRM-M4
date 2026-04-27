
export enum FunnelStatus {
  INITIAL = 'inicial',
  INTERMEDIATE = 'intermediario',
  WON = 'ganho',
  LOST = 'perdido'
}

export interface PipelineStage {
  id: string;
  name: string;
  color?: string;
  position?: number;
  status: FunnelStatus;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  position?: number;
  workspace_id?: string;
}

export enum LeadTemperature {
  COLD = 'Frio',
  WARM = 'Morno',
  HOT = 'Quente'
}

export interface Interaction {
  id: string;
  lead_id: string;
  type: 'WhatsApp' | 'Ligação' | 'E-mail' | 'Reunião' | 'Outro';
  note: string;
  success: boolean;
  workspace_id: string;
  created_at: string;
}

export interface Company {
  id: string;
  workspace_id?: string;
  name: string;
  cnpj?: string;
  city?: string;
  state?: string;
  segment?: string;
  website?: string;
  email?: string;
  whatsapp?: string;
  notes?: string;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  workspace_id?: string;
  company_id: string;
  name: string;
  role?: string;
  email?: string;
  whatsapp?: string;
  linkedin?: string;
  notes?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  company?: {
    id: string;
    name: string;
    city?: string;
    state?: string;
  };
}

export interface Lead {
  id: string;
  workspace_id: string;
  company_name: string;
  company_cnpj?: string;
  company_city?: string;
  company_state?: string;
  company_niche?: string;
  company_website?: string;
  company_email?: string;
  company_instagram?: string;
  company_linkedin?: string;
  company_whatsapp?: string;
  contact_name: string;
  contact_role?: string;
  contact_email?: string;
  contact_instagram?: string;
  contact_linkedin?: string;
  contact_whatsapp?: string;
  contact_notes?: string;
  pipeline_id?: string;
  stage_id?: string;
  stage: string;
  value: number;
  business_notes: string;
  service_type?: string;
  proposed_ticket?: number;
  next_action?: string;
  next_action_date?: string;
  qualification?: string;
  source?: string;
  campaign?: string;
  closing_forecast?: string;
  temperature?: LeadTemperature;
  probability?: number;
  ai_score?: number;
  ai_reasoning?: string;
  responsible_name?: string;
  responsible_id?: string;
  company_id?: string;
  contact_id?: string;
  last_activity_at?: string;
  status?: 'active' | 'won' | 'lost' | 'paused' | FunnelStatus;
  interactions?: Interaction[];
  custom_fields?: Record<string, any>;
  deleted_at?: string | null;
  created_at: string;

  company?: {
    id: string;
    name: string;
    niche?: string;
    city?: string;
    state?: string;
  };

  // Legacy / Compatibility
  name?: string;
  email?: string;
  whatsapp?: string;
  notes?: string;
  cnpj?: string;
  website?: string;
  niche?: string;
  city?: string;
  state?: string;
  instagram?: string;
  linkedin?: string;
}

export interface CustomFieldDef {
  id: string;
  entity_type: 'lead' | 'client' | 'task';
  field_name: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'multiselect';
  options?: string[];
  workspace_id?: string;
  created_at: string;
}

export interface CustomFieldValue {
  id: string;
  custom_field_id: string;
  entity_id: string;
  value: any;
  workspace_id?: string;
  created_at: string;
}

export interface FormQuestion {
  id: string;
  type: 'text' | 'long_text' | 'multiple_choice' | 'checkbox' | 'script';
  label: string;
  options?: string[];
  required?: boolean;
  logic?: any;
}

export interface FormTemplate {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  questions: FormQuestion[];
  created_at: string;
}

export interface FormResponse {
  id: string;
  form_id: string;
  lead_id: string;
  workspace_id?: string;
  answers: {
    question_id: string;
    value: any;
  }[];
  created_at: string;
}

export interface M4Client {
  id: string;
  lead_id?: string;
  company_id?: string;
  company_name: string;
  status: 'active' | 'paused' | 'churned';
  contract_start_date?: string;
  monthly_value?: number;
  services?: string[];
  manager_id?: string;
  workspace_id?: string;
  created_at: string;
}

export enum AutomationTriggerType {
  LEAD_CREATED = 'lead_created',
  STATUS_CHANGE = 'status_change',
  STAGE_CHANGE = 'stage_change',
  RESPONSIBLE_CHANGE = 'responsible_change',
  FIELD_UPDATE = 'field_update',
  NO_ACTIVITY = 'no_activity',
  DATE_TRIGGER = 'date_trigger',
  TASK_CREATED = 'task_created',
  TASK_COMPLETED = 'task_completed'
}

export enum AutomationEntityType {
  LEAD = 'lead',
  TASK = 'task',
  CLIENT = 'client'
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
  pipeline_id?: string;
  from_stage_id?: string;
  to_stage_id?: string;
  from_status?: string;
  to_status?: string;
  responsible_id?: string;
}

export interface AutomationAction {
  type: 'create_task' | 'send_email' | 'update_field' | 'notify_user' | 'webhook' | 'change_stage' | 'move_to_pipeline' | 'duplicate_to_pipeline' | 'assign_user';
  params?: any;
  config?: any; // Compatibility
}

export interface Automation {
  id: string;
  workspace_id: string;
  name: string;
  entity_type: AutomationEntityType;
  trigger_type: AutomationTriggerType;
  trigger_conditions: AutomationCondition[] | any;
  actions: AutomationAction[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
