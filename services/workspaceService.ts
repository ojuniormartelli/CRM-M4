
import { supabase } from '../lib/supabase';
import { mappers, isUUID } from '../lib/mappers';
import { WorkspaceNav, Folder, List } from '../types';

export const workspaceService = {
  async getWorkspaces() {
    try {
      const { data, error } = await supabase
        .from('m4_workspaces')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return (data || []) as WorkspaceNav[];
    } catch (error) {
      console.error('workspaceService.getWorkspaces error:', error);
      return [];
    }
  },

  async resolveWorkspaceForUser(userId: string): Promise<string> {
    if (!userId || userId === 'unknown') {
      throw new Error('Identificação do usuário não encontrada. Por favor, faça login novamente.');
    }

    try {
      // 1. Tenta tabela m4_users diretamente (perfil padrão do usuário)
      const { data: m4UserData, error: userError } = await supabase
        .from('m4_users')
        .select('workspace_id')
        .eq('id', userId)
        .maybeSingle();

      if (userError) throw userError;

      if (m4UserData?.workspace_id && isUUID(m4UserData.workspace_id)) {
        return m4UserData.workspace_id;
      }

      // 2. Tenta m4_workspace_users (tabela de mapeamento para múltiplos workspaces/convites)
      const { data: m4LinkData, error: linkError } = await supabase
        .from('m4_workspace_users')
        .select('workspace_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (linkError) throw linkError;

      if (m4LinkData?.workspace_id && isUUID(m4LinkData.workspace_id)) {
        return m4LinkData.workspace_id;
      }

      // Se chegar aqui, o usuário existe mas não tem workspace vinculado
      throw new Error('Nenhum workspace vinculado a este usuário. Entre em contato com o administrador para receber um convite.');
    } catch (error: any) {
      console.error('workspaceService: Erro fatal ao resolver workspace:', error);
      throw new Error(error.message || 'Erro interno ao identificar seu espaço de trabalho.');
    }
  },

  async getFolders(workspaceNavId: string) {
    const { data, error } = await supabase
      .from('m4_folders')
      .select('*')
      .eq('workspace_nav_id', workspaceNavId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data as Folder[];
  },

  async getLists(folderId?: string, workspaceNavId?: string) {
    let query = supabase.from('m4_lists').select('*');
    if (folderId) query = query.eq('folder_id', folderId);
    if (workspaceNavId) query = query.eq('workspace_nav_id', workspaceNavId);
    
    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) throw error;
    return data as List[];
  }
};
