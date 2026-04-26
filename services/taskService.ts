
import { supabase } from '../lib/supabase';
import { mappers, isUUID } from '../lib/mappers';
import { Task } from '../types';
import { automationService } from './automationService';

export const taskService = {
  async getAll(workspaceId?: string) {
    let query = supabase
      .from('m4_tasks')
      .select('*');

    if (workspaceId && isUUID(workspaceId)) {
      query = query.eq('workspace_id', workspaceId).is('deleted_at', null);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data as Task[];
  },

  async create(task: Partial<Task>, workspaceId: string) {
    const payload = mappers.task(task, workspaceId);
    const { data, error } = await supabase
      .from('m4_tasks')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    
    const createdTask = data as Task;
    automationService.processEvent(workspaceId, 'task', 'task_created', {}, createdTask);
    
    return createdTask;
  },

  async update(id: string, task: Partial<Task>) {
    const { data: currentTask } = await supabase.from('m4_tasks').select('*').eq('id', id).single();
    
    const payload = mappers.task(task);
    const { data, error } = await supabase
      .from('m4_tasks')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    
    const updatedTask = data as Task;
    
    if (currentTask) {
      if (task.status && task.status !== currentTask.status) {
        const trigger = task.status === 'Concluído' ? 'task_completed' : 'status_change';
        automationService.processEvent(updatedTask.workspace_id || '', 'task', trigger, {
          from_status: currentTask.status,
          to_status: updatedTask.status
        }, updatedTask);
      }
    }
    
    return updatedTask;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('m4_tasks')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
