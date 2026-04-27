import { supabase } from '../lib/supabase';
import { isUUID } from '../lib/mappers';
import { WorkspaceNav, Folder, List } from '../types';

export const workspaceService = {
  async getWorkspaces(): Promise<WorkspaceNav[]> {
    const { data, error } = await supabase
      .from('m4_workspaces')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data ?? []) as WorkspaceNav[];
  },

  async resolveWorkspaceForUser(userId: string): Promise<string> {
    if (!userId || userId === 'unknown') {
      throw new Error('Identificação do usuário não encontrada. Por favor, faça login novamente.');
    }

    // 1. Perfil padrão em m4_users
    const { data: m4UserData, error: userError } = await supabase
      .from('m4_users')
      .select('workspace_id')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      // Non-fatal: log and continue to next strategy
      console.warn('[workspaceService] m4_users lookup failed:', userError.message);
    }

    if (m4UserData?.workspace_id && isUUID(m4UserData.workspace_id)) {
      return m4UserData.workspace_id;
    }

    // 2. Tabela de convites / mapeamento m4_workspace_users
    const { data: m4LinkData, error: linkError } = await supabase
      .from('m4_workspace_users')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (linkError) {
      console.warn('[workspaceService] m4_workspace_users lookup failed:', linkError.message);
    }

    if (m4LinkData?.workspace_id && isUUID(m4LinkData.workspace_id)) {
      return m4LinkData.workspace_id;
    }

    // 3. Sem vinculo — retorna string vazia para o hook tratar (redirecionar ao Setup/Onboarding)
    return '';
  },

  async getFolders(workspaceNavId: string): Promise<Folder[]> {
    const { data, error } = await supabase
      .from('m4_folders')
      .select('*')
      .eq('workspace_nav_id', workspaceNavId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as Folder[];
  },

  async getLists(folderId?: string, workspaceNavId?: string): Promise<List[]> {
    let query = supabase.from('m4_lists').select('*');
    if (folderId) query = query.eq('folder_id', folderId);
    if (workspaceNavId) query = query.eq('workspace_nav_id', workspaceNavId);

    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) throw error;
    return data as List[];
  },
};
