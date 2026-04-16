
import { User } from './auth';

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

export interface Task {
  id: string;
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
  recurrence_type?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrence_pattern?: any;
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

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
  user?: User;
}
