
export enum AppMode {
  EUGENCIA = 'eugencia',
  AGENCIA = 'agencia'
}

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

export enum TaskStatus {
  TODO = 'Pendente',
  IN_PROGRESS = 'Em Execução',
  REVIEW = 'Revisão',
  DONE = 'Concluído'
}

export enum Priority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta',
  URGENT = 'Urgente'
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
  phone?: string;
  whatsapp?: string;
  notes?: string;
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
  phone?: string;
  whatsapp?: string;
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

export interface FormQuestion {
  id: string;
  type: 'text' | 'long_text' | 'multiple_choice' | 'checkbox' | 'script';
  label: string;
  options?: string[]; // For multiple_choice and checkbox
  required?: boolean;
  logic?: {
    trigger_value: string;
    go_to_question_id: string; // ID of the next question or 'end'
  }[];
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
  answers: {
    question_id: string;
    value: any;
  }[];
  created_at: string;
}

export interface Lead {
  id: string;
  workspace_id: string;
  
  // Prospect Company Data
  company_name: string;
  company_cnpj?: string;
  company_city?: string;
  company_state?: string;
  company_niche?: string;
  company_website?: string;
  company_email?: string;
  company_phone?: string;
  
  // Contact / Decision Maker Data
  contact_name: string;
  contact_role?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_notes?: string;
  
  // Business Data
  pipeline_id?: string;
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
  
  // Metadata & System
  responsible_name?: string;
  responsible_id?: string;
  company_id?: string;
  contact_id?: string;
  last_activity_at?: string;
  status?: 'active' | 'won' | 'lost' | 'paused' | FunnelStatus;
  interactions?: Interaction[];
  custom_fields?: Record<string, any>;
  created_at: string;

  // Legacy / Compatibility (Optional: can be removed if strictly following "total convergence")
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  notes?: string;
  cnpj?: string;
  website?: string;
  niche?: string;
  city?: string;
  state?: string;
}

export interface Task {
  id: string;
  tenant_id?: string;
  workspace_id?: string;
  title: string;
  description: string;
  status: TaskStatus | string;
  priority: Priority | string;
  assigned_to?: string;
  due_date?: string;
  start_date?: string;
  lead_id?: string;
  deal_id?: string;
  company_id?: string;
  contact_id?: string;
  project_id?: string;
  client_id?: string;
  client_account_id?: string;
  is_recurring?: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrence_pattern?: any;
  recurrence_type?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrence_days?: string;
  recurrence_day_of_month?: number;
  recurrence_month_week?: string;
  recurrence_occurrences?: number;
  recurrence_end_date?: string;
  parent_task_id?: string;
  checklist?: { item: string; checked: boolean }[];
  dependencies?: string[];
  estimated_hours?: number;
  actual_hours?: number;
  depends_on_task_id?: string;
  list_id?: string;
  tags?: string;
  task_type?: 'commercial' | 'operational' | 'internal';
  type?: 'call' | 'meeting' | 'email' | 'task' | 'proposal' | 'WhatsApp' | 'Ligação' | 'E-mail' | 'Reunião' | 'Outro';
  interaction_success?: boolean;
  interaction_note?: string;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
  user?: User;
}

export interface TaskTimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  created_at: string;
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
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

export interface TaskTemplate {
  id: string;
  name: string;
  trigger_event: 'lead_won' | 'client_onboarding' | 'monthly_routine';
  tasks: {
    title: string;
    description?: string;
    due_days: number;
    assignee?: string;
  }[];
  workspace_id?: string;
  created_at: string;
}

export interface WorkspaceNav {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  workspace_id?: string;
  created_at: string;
}

export interface Folder {
  id: string;
  workspace_nav_id: string;
  name: string;
  workspace_id?: string;
  created_at: string;
}

export interface List {
  id: string;
  folder_id?: string;
  workspace_nav_id?: string;
  name: string;
  view_type: 'kanban' | 'list' | 'calendar' | 'table';
  workspace_id?: string;
  created_at: string;
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

export interface M4Automation {
  id: string;
  name: string;
  trigger_type: 'status_change' | 'date_trigger' | 'field_update' | 'stage_change' | 'lead_created' | 'no_activity';
  trigger_conditions: any;
  actions: {
    type: 'create_task' | 'send_email' | 'create_project' | 'alert_user' | 'create_client';
    config: any;
  }[];
  is_active: boolean;
  workspace_id?: string;
  created_at: string;
}

export interface TimeTracking {
  id: string;
  task_id: string;
  user_id?: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  workspace_id?: string;
  created_at: string;
}

export interface Project {
  id: string;
  workspace_id?: string;
  name: string;
  client_id: string;
  lead_id?: string;
  company_id?: string;
  status: 'active' | 'completed' | 'on_hold';
  start_date: string;
  end_date?: string;
  value: number;
  description?: string;
  type?: 'recorrente' | 'projeto';
  payment_method?: string;
  created_at: string;
}

// Removed duplicate Client and Automation interfaces

export interface Service {
  id: string;
  name: string;
  default_price: number;
  workspace_id?: string;
  created_at: string;
}

export interface FinanceCategory {
  id: string;
  name: string;
  type: 'Receita' | 'Despesa';
  workspace_id?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  workspace_id?: string;
}

export interface ClientAccount {
  id: string;
  workspace_id?: string;
  lead_id?: string;
  company_id: string;
  status: 'ativo' | 'pausado' | 'cancelado';
  service_type: string;
  service_name?: string;
  start_date: string;
  end_date?: string;
  billing_model: 'recorrente' | 'projeto';
  monthly_value: number;
  due_day?: number;
  bank_account_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  company?: { name: string };
}

export interface BankAccount {
  id: string;
  workspace_id?: string;
  name: string;
  type: string; // corrente, poupança, caixa, cartão, investimento
  bank?: string;
  balance: number;
  currency: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreditCard {
  id: string;
  name: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  workspace_id?: string;
  type: 'Receita' | 'Despesa' | 'Transferência';
  category: string;
  amount: number;
  date: string;
  description: string;
  status: 'Pago' | 'Pendente' | 'Recebido' | 'A Receber' | 'A Pagar' | 'Confirmado' | 'Atrasado' | 'Projetado';
  bank_account_id?: string;
  client_account_id?: string;
  lead_id?: string;
  company_id?: string;
  credit_card_id?: string;
  payment_method?: string;
  due_date?: string;
  paid_date?: string; // Effective payment/receipt date (DB column)
  notes?: string;
  created_at: string;
  updated_at?: string;
  is_projected?: boolean;
  is_recurring?: boolean;
  recurrence_type?: 'weekly' | 'monthly' | 'yearly' | 'semanal' | 'quinzenal' | 'mensal' | 'anual' | 'personalizado';
  recurrence?: 'fixed' | 'variable';
  recurrence_interval?: number;
  recurrence_day?: number;
  recurrence_day_of_month?: number;
  recurrence_day_of_week?: number;
  recurrence_month?: number;
  recurrence_unit?: 'days' | 'weeks' | 'months' | 'years';
  recurrence_end_date?: string;
  recurring_id?: string;
  recurrence_period?: 'monthly';
  months?: number | 'indefinite';
}

export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  USER = 'user'
}

export interface JobRole {
  id: string;
  workspace_id?: string;
  name: string;
  level: number;
  permissions: Record<string, any>;
  created_at: string;
}

export interface User {
  id: string;
  auth_user_id?: string;
  name: string;
  username?: string;
  email: string;
  password?: string;
  avatar_url?: string;
  role: UserRole;
  job_role_id?: string;
  workspace_id?: string;
  status: 'active' | 'inactive';
  must_change_password?: boolean;
  created_at: string;
  updated_at: string;
  job_role?: JobRole;
}

export interface EmailMessage {
  id: string;
  sender_name: string;
  sender_email: string;
  recipient_email: string;
  subject: string;
  body: string;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash';
  is_read: boolean;
  is_starred: boolean;
  created_at: string;
  lead_id?: string;
  company_id?: string;
  contact_id?: string;
}

export interface Goal {
  id: string;
  workspace_id: string;
  month: string; // ISO date string (first day of month)
  revenue_goal: number;
  leads_goal: number;
  created_at: string;
  updated_at: string;
}
