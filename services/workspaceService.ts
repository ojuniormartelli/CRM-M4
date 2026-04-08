
import { supabase } from '../lib/supabase';
import { mappers } from '../lib/mappers';
import { WorkspaceNav, Folder, List } from '../types';

export const workspaceService = {
  async getWorkspaces() {
    const { data, error } = await supabase
      .from('m4_workspaces')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data as WorkspaceNav[];
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
