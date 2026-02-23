
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

export interface Contact {
  id?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  whatsappLink?: string;
}

export enum LeadTemperature {
  COLD = 'Frio',
  WARM = 'Morno',
  HOT = 'Quente'
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  pipelineId: string;
  stageId: string;
  value: number;
  notes: string;
  segment?: string;
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
  
  lastActivityAt?: string;
  status?: 'active' | 'won' | 'lost' | 'paused';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignedTo: string;
  dueDate: string;
  leadId?: string;
  projectId?: string;
  type: 'call' | 'meeting' | 'email' | 'task' | 'proposal';
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  leadId?: string;
  status: 'active' | 'completed' | 'on_hold';
  startDate: string;
  endDate?: string;
  value: number;
  description?: string;
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

export interface Transaction {
  id: string;
  type: 'Receita' | 'Despesa';
  category: string;
  amount: number;
  date: string;
  description: string;
  status: 'Pago' | 'Pendente';
  clientId?: string;
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
}
