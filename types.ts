
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
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignedTo: string;
  dueDate: string;
  projectId?: string;
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
}

export interface Client {
  id: string;
  name: string;
  email: string;
  plan: string;
  mrr: number;
  status: 'Ativo' | 'Inativo' | 'Pendente';
  contractStart: string;
  contractEnd: string;
}

export interface Transaction {
  id: string;
  type: 'Receita' | 'Despesa';
  category: string;
  amount: number;
  date: string;
  description: string;
  status: 'Pago' | 'Pendente';
}
