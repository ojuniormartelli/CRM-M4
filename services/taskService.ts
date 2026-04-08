
import { supabase } from '../lib/supabase';
import { mappers } from '../lib/mappers';
import { Task } from '../types';

export const taskService = {
  async getAll() {
    const { data, error } = await supabase
      .from('m4_tasks')
      .select('*')
      .order('created_at', { ascending: false });
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
    return data as Task;
  },

  async update(id: string, task: Partial<Task>) {
    const payload = mappers.task(task);
    const { data, error } = await supabase
      .from('m4_tasks')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Task;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('m4_tasks')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
