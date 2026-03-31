
export enum AppMode {
  EUGENCIA = 'eugencia',
  AGENCIA = 'agencia'
}

export interface PipelineStage {
  id: string;
  name: string;
  color?: string;
  position?: number;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
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
  instagram?: string;
  linkedin?: string;
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
  instagram?: string;
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

export enum LeadTemperature {
  COLD = 'Frio',
  WARM = 'Morno',
  HOT = 'Quente'
}

export interface Interaction {
  id: string;
  tenant_id: string;
  lead_id: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'status_change' | 'ai_insight';
  title: string;
  content: string;
  created_at: string;
  created_by?: string;
  metadata?: any;
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
  name: string;
  company: string;
  email: string;
  phone: string;
  pipeline_id?: string;
  stage: string;
  value: number;
  notes: string;
  niche?: string;
  service_type?: string;
  proposed_ticket?: number;
  next_action?: string;
  next_action_date?: string;
  address?: string;
  cnpj?: string;
  partners?: string;
  additional_emails?: string;
  additional_phones?: string;
  legal_nature?: string;
  created_at: string;
  
  // New fields for enhanced CRM
  qualification?: string;
  source?: string;
  campaign?: string;
  city?: string;
  state?: string;
  closing_forecast?: string;
  temperature?: LeadTemperature;
  probability?: number;
  ai_score?: number;
  ai_reasoning?: string;
  
  // Prospect Company Data
  company_whatsapp?: string;
  instagram?: string;
  company_linkedin?: string;
  company_email?: string;
  company_phone?: string;
  website?: string;
  
  // Contact / Decision Maker Data
  contact_role?: string;
  contact_whatsapp?: string;
  contact_instagram?: string;
  contact_linkedin?: string;
  contact_notes?: string;
  
  // Legacy / Other
  legal_name?: string;
  
  // Contacts and Responsibility
  contacts?: Contact[];
  responsible_name?: string;
  responsible_id?: string;
  
  // Bitrix24 Refactoring
  company_id?: string;
  contact_id?: string;
  
  last_activity_at?: string;
  status?: 'active' | 'won' | 'lost' | 'paused';
  interactions?: Interaction[];
  custom_fields?: Record<string, any>;
}

export interface Task {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigned_to: string;
  due_date: string;
  lead_id?: string;
  deal_id?: string;
  company_id?: string;
  contact_id?: string;
  project_id?: string;
  client_account_id?: string;
  is_recurring?: boolean;
  recurrence_type?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrence_days?: string; // e.g., 'MON,WED'
  recurrence_day_of_month?: number;
  recurrence_month_week?: string; // e.g., 'first_monday'
  recurrence_end_date?: string;
  recurrence_occurrences?: number;
  type: 'call' | 'meeting' | 'email' | 'task' | 'proposal';
  created_at: string;
}

export interface Project {
  id: string;
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
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  cnpj?: string;
  status: 'active' | 'inactive';
  mrr: number;
  contract_start: string;
  contract_end?: string;
  health_score: number; // 0-100
}

export interface Automation {
  id: string;
  name: string;
  trigger: {
    type: 'stage_change' | 'lead_created' | 'no_activity';
    value?: string; // stage or days
  };
  actions: {
    type: 'create_task' | 'send_email' | 'create_project' | 'alert_user';
    config: any;
  }[];
  is_active: boolean;
}

export interface Service {
  id: string;
  name: string;
  default_price: number;
  workspace_id?: string;
  created_at: string;
}

export interface ClientAccount {
  id: string;
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
  notes?: string;
  created_at: string;
  updated_at: string;
  company?: { name: string };
}

export interface BankAccount {
  id: string;
  name: string;
  bank_type: string;
  current_balance: number;
  currency: string;
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
  type: 'Receita' | 'Despesa' | 'Transferência';
  category: string;
  amount: number;
  date: string;
  description: string;
  status: 'Pago' | 'Pendente' | 'Recebido' | 'A Receber' | 'A Pagar';
  bank_account_id?: string;
  client_account_id?: string;
  lead_id?: string;
  company_id?: string;
  credit_card_id?: string;
  payment_method?: string;
  due_date?: string;
  paid_date?: string;
  created_at: string;
  isProjected?: boolean;
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
