
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

      if (userError) {
        console.warn('workspaceService: Erro ao ler m4_users:', userError);
      }

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

      if (linkError) {
        console.warn('workspaceService: Erro ao ler m4_workspace_users:', linkError);
      }

      if (m4LinkData?.workspace_id && isUUID(m4LinkData.workspace_id)) {
        return m4LinkData.workspace_id;
      }

      // 3. Fallback: Se não houver vínculo em lugar nenhum, mas for o primeiro acesso pós-setup,
      // ele pode precisar de um vínculo emergencial ou ser direcionado ao onboarding.
      // Retornamos null ou lançamos um erro específico que o Gancho useWorkspace saiba tratar.
      return ''; 
    } catch (error: any) {
      console.error('workspaceService: Erro fatal ao resolver workspace:', error);
      return '';
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
