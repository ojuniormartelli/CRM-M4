
import { supabase } from '../lib/supabase';
import { Goal } from '../types';

export const goalService = {
  getAll: async (workspaceId: string): Promise<Goal[]> => {
    const { data, error } = await supabase
      .from('m4_goals')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('month', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  upsert: async (goal: Partial<Goal>): Promise<Goal> => {
    const { data, error } = await supabase
      .from('m4_goals')
      .upsert({
        ...goal,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getByMonth: async (workspaceId: string, month: string): Promise<Goal | null> => {
    const { data, error } = await supabase
      .from('m4_goals')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('month', month)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
};
