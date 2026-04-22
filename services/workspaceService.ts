
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
    if (!userId || userId === 'unknown') throw new Error('User ID is required');

    const DEFAULT_WS_ID = 'fb786658-1234-4321-8888-999988887777';

    try {
      // 1. Try m4_workspace_users
      const { data: m4LinkData } = await supabase
        .from('m4_workspace_users')
        .select('workspace_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (m4LinkData?.workspace_id && isUUID(m4LinkData.workspace_id)) {
        console.log('workspaceService: Resolved via m4_workspace_users:', m4LinkData.workspace_id);
        return m4LinkData.workspace_id;
      }

      // 2. Try m4_users table
      const { data: m4UserData } = await supabase
        .from('m4_users')
        .select('workspace_id')
        .eq('id', userId)
        .maybeSingle();

      if (m4UserData?.workspace_id && isUUID(m4UserData.workspace_id)) {
        console.log('workspaceService: Resolved via m4_users:', m4UserData.workspace_id);
        return m4UserData.workspace_id;
      }

      // 3. Fallback: Get First Available Workspace
      const { data: firstWs } = await supabase.from('m4_workspaces').select('id').limit(1).maybeSingle();
      if (firstWs?.id) return firstWs.id;

      return DEFAULT_WS_ID;
    } catch (error) {
      console.error('workspaceService: Resolve fatal error:', error);
      return DEFAULT_WS_ID;
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
