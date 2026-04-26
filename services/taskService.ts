
import { supabase } from '../lib/supabase';
import { mappers, isUUID } from '../lib/mappers';
import { Task } from '../types';
import { automationService } from './automationService';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const workspaceId = localStorage.getItem('m4_crm_workspace_id');
  const userId = localStorage.getItem('m4_crm_user_id');

  let errorMessage = 'Erro desconhecido';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    errorMessage = (error as any).message || (error as any).details || JSON.stringify(error);
  }

  const errInfo = {
    error: errorMessage,
    authInfo: { userId: userId || 'unknown', workspaceId },
    operationType,
    path
  };
  
  console.error('Task Service Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const taskService = {
  async getAll(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return [];

    try {
      const { data, error } = await supabase
        .from('m4_tasks')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Task[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_tasks');
      return [];
    }
  },

  async create(task: Partial<Task>, workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) throw new Error('Workspace ID obrigatório para criar tarefa');
    const payload = mappers.task(task, workspaceId);

    try {
      const { data, error } = await supabase
        .from('m4_tasks')
        .insert([payload])
        .select()
        .single();
      
      if (error) throw error;
      
      const createdTask = data as Task;
      automationService.processEvent(workspaceId, 'task', 'task_created', {}, createdTask);
      
      return createdTask;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'm4_tasks');
      throw error;
    }
  },

  async update(id: string, task: Partial<Task>, workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) throw new Error('Workspace ID obrigatório para atualizar tarefa');
    try {
      const { data: currentTask, error: fetchError } = await supabase
        .from('m4_tasks')
        .select('*')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const payload = mappers.task(task);
      const { data, error } = await supabase
        .from('m4_tasks')
        .update(payload)
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .select()
        .single();
      
      if (error) throw error;
      
      const updatedTask = data as Task;
      
      if (currentTask) {
        if (task.status && task.status !== currentTask.status) {
          const trigger = task.status === 'Concluído' ? 'task_completed' : 'status_change';
          automationService.processEvent(workspaceId, 'task', trigger, {
            from_status: currentTask.status,
            to_status: updatedTask.status
          }, updatedTask);
        }
      }
      
      return updatedTask;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'm4_tasks');
      throw error;
    }
  },

  async delete(id: string, workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) throw new Error('Workspace ID obrigatório para excluir tarefa');
    try {
      const { error } = await supabase
        .from('m4_tasks')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspaceId);

      if (error) throw error;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'm4_tasks');
      throw error;
    }
  }
};

