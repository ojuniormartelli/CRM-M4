
export enum AppMode {
  EUGENCIA = 'eugencia',
  AGENCIA = 'agencia'
}

export interface PipelineStage {
  id: string;
  name: string;
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
  instagram?: string;
  phone?: string;
  whatsapp?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  workspace_id?: string;
  companyId: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  linkedin?: string;
  notes?: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum LeadTemperature {
  COLD = 'Frio',
  WARM = 'Morno',
  HOT = 'Quente'
}

export interface Interaction {
  id: string;
  tenantId: string;
  leadId: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'status_change' | 'ai_insight';
  title: string;
  content: string;
  createdAt: string;
  createdBy?: string;
  metadata?: any;
}

export interface FormQuestion {
  id: string;
  type: 'text' | 'long_text' | 'multiple_choice' | 'checkbox' | 'script';
  label: string;
  options?: string[]; // For multiple_choice and checkbox
  required?: boolean;
  logic?: {
    triggerValue: string;
    goToQuestionId: string; // ID of the next question or 'end'
  }[];
}

export interface FormTemplate {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  questions: FormQuestion[];
  createdAt: string;
}

export interface FormResponse {
  id: string;
  formId: string;
  leadId: string;
  answers: {
    questionId: string;
    value: any;
  }[];
  createdAt: string;
}

export interface Lead {
  id: string;
  tenantId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  pipelineId: string;
  stageId: string;
  value: number;
  notes: string;
  segment?: string;
  niche?: string; // New field
  serviceType?: string; // New field
  proposedTicket?: number; // New field
  nextAction?: string; // New field
  nextActionDate?: string; // New field
  address?: string;
  cnpj?: string;
  partners?: string;
  additionalEmails?: string;
  additionalPhones?: string;
  legalNature?: string;
  createdAt: string;
  
  // New fields for enhanced CRM
  qualification?: string;
  source?: string;
  campaign?: string;
  city?: string;
  state?: string;
  closingForecast?: string;
  temperature?: LeadTemperature;
  probability?: number;
  aiScore?: number;
  aiReasoning?: string;
  
  // Company specific
  legalName?: string;
  instagram?: string;
  website?: string;
  companyEmail?: string;
  companyPhone?: string;
  
  // Contacts and Responsibility
  contacts?: Contact[];
  responsibleName?: string;
  responsibleId?: string;
  
  // Bitrix24 Refactoring
  companyId?: string;
  contactId?: string;
  
  lastActivityAt?: string;
  status?: 'active' | 'won' | 'lost' | 'paused';
  interactions?: Interaction[];
  customFields?: Record<string, any>;
}

export interface Task {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignedTo: string;
  dueDate: string;
  leadId?: string;
  dealId?: string;
  companyId?: string;
  projectId?: string;
  clientAccountId?: string;
  isRecurring?: boolean;
  recurrencePeriod?: string;
  type: 'call' | 'meeting' | 'email' | 'task' | 'proposal';
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  leadId?: string;
  companyId?: string;
  status: 'active' | 'completed' | 'on_hold';
  startDate: string;
  endDate?: string;
  value: number;
  description?: string;
  type?: 'recorrente' | 'projeto';
  paymentMethod?: string;
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
  contractStart: string;
  contractEnd?: string;
  healthScore: number; // 0-100
}

export interface Automation {
  id: string;
  name: string;
  trigger: {
    type: 'stage_change' | 'lead_created' | 'no_activity';
    value?: string; // stageId or days
  };
  actions: {
    type: 'create_task' | 'send_email' | 'create_project' | 'alert_user';
    config: any;
  }[];
  isActive: boolean;
}

export interface ClientAccount {
  id: string;
  leadId: string;
  companyId?: string;
  status: 'ativo' | 'pausado' | 'cancelado';
  serviceType: string;
  startDate: string;
  endDate?: string;
  billingModel: 'recorrente' | 'projeto';
  monthlyValue: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccount {
  id: string;
  name: string;
  bankType: string;
  currentBalance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCard {
  id: string;
  name: string;
  limitAmount: number;
  closingDay: number;
  dueDay: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: 'Receita' | 'Despesa' | 'Transferência';
  category: string;
  amount: number;
  date: string;
  description: string;
  status: 'Pago' | 'Pendente' | 'Recebido' | 'A Receber' | 'A Pagar';
  bankAccountId?: string;
  clientAccountId?: string;
  leadId?: string;
  companyId?: string;
  creditCardId?: string;
  paymentMethod?: string;
  dueDate?: string;
  paidDate?: string;
  createdAt: string;
}

export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  USER = 'user'
}

export interface User {
  id: string;
  auth_user_id?: string;
  name: string;
  email: string;
  password?: string;
  avatar_url?: string;
  role: UserRole;
  workspace_id?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
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
  leadId?: string;
  companyId?: string;
  contactId?: string;
}
