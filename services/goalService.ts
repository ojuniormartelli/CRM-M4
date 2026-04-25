
import { supabase } from '../lib/supabase';
import { Goal } from '../types';

export const goalService = {
  getAll: async (workspaceId: string): Promise<Goal[]> => {
    try {
      const { data, error } = await supabase
        .from('m4_goals')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('month', { ascending: false });

      if (error) {
        if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.message?.includes('not found')) {
          console.warn('Aviso: Tabela m4_goals não encontrada.');
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (err) {
      console.warn('Erro ao carregar metas:', err);
      return [];
    }
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
    try {
      const { data, error } = await supabase
        .from('m4_goals')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('month', month)
        .maybeSingle();

      if (error) {
        // Se a tabela não existe, loga um aviso amigável mas não interrompe o app
        if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.message?.includes('not found')) {
          console.warn('Aviso: Tabela m4_goals não encontrada. Certifique-se de executar o script SQL de metas.');
          return null;
        }
        throw error;
      }
      return data;
    } catch (err) {
      console.warn('Erro ao buscar meta:', err);
      return null;
    }
  }
};
