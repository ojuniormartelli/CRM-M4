
import { supabase } from '../lib/supabase';
import { mappers, isUUID } from '../lib/mappers';
import { WorkspaceNav, Folder, List } from '../types';

export const workspaceService = {
  async getWorkspaces() {
    try {
      // Tentar m4_workspaces
      const { data: m4Data } = await supabase
        .from('m4_workspaces')
        .select('*');
      
      // Tentar workspaces (sem m4_)
      const { data: altData } = await supabase
        .from('workspaces')
        .select('*');
      
      const all = [...(m4Data || []), ...(altData || [])];
      
      // Unificar por ID para evitar duplicatas se o banco tiver ambas
      const unique = all.reduce((acc: any[], curr: any) => {
        const id = curr.workspace_id || curr.id;
        if (!acc.find(w => (w.workspace_id || w.id) === id)) {
          acc.push(curr);
        }
        return acc;
      }, []);

      return unique as WorkspaceNav[];
    } catch (error) {
      console.error('workspaceService.getWorkspaces error:', error);
      return [];
    }
  },

  async resolveWorkspaceForUser(userId: string): Promise<string> {
    if (!userId || userId === 'unknown') throw new Error('User ID is required');

    try {
      // 1. Try to find link in workspace_users (as requested by user)
      const { data: linkData } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (linkData?.workspace_id && isUUID(linkData.workspace_id)) {
        return linkData.workspace_id;
      }

      // Try m4_workspace_users as fallback for linking table
      const { data: m4LinkData } = await supabase
        .from('m4_workspace_users')
        .select('workspace_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (m4LinkData?.workspace_id && isUUID(m4LinkData.workspace_id)) {
        return m4LinkData.workspace_id;
      }

      // 2. Fallback: Try m4_users.workspace_id (existing pattern)
      const { data: userData } = await supabase
        .from('m4_users')
        .select('workspace_id')
        .eq('id', userId)
        .maybeSingle();

      if (userData?.workspace_id && isUUID(userData.workspace_id)) {
        return userData.workspace_id;
      }

      // 3. Fallback: Check if there is ANY workspace in 'workspaces' table (the real one according to user)
      const { data: wsRealData } = await supabase
        .from('workspaces')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (wsRealData?.id && isUUID(wsRealData.id)) {
        return wsRealData.id;
      }

      // 4. Fallback: Check m4_workspaces
      const { data: wsData } = await supabase
        .from('m4_workspaces')
        .select('workspace_id')
        .limit(1)
        .maybeSingle();

      if (wsData?.workspace_id && isUUID(wsData.workspace_id)) {
        return wsData.workspace_id;
      }

      // 5. Create new workspace if none found
      console.log('workspaceService: No workspace found, creating new one...');
      const newWsId = crypto.randomUUID();
      
      // Try to create in 'workspaces' or 'm4_workspaces'
      // We'll use a transaction style or handle errors
      const { data: newWs, error: createError } = await supabase
        .from('m4_workspaces')
        .insert({ 
          name: 'Meu Workspace', 
          workspace_id: newWsId // This is the tenant ID
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating workspace:', createError);
        // If m4_workspaces fails, maybe the user wants 'workspaces'
        const { data: altWs, error: altError } = await supabase
          .from('workspaces')
          .insert({ name: 'Meu Workspace' })
          .select()
          .single();
        
        if (altError) throw altError;
        
        // Link user to this new workspace
        await supabase.from('workspace_users').insert({
          user_id: userId,
          workspace_id: altWs.id
        });

        return altWs.id;
      }

      // Link user to the new m4_workspace
      await supabase.from('m4_users').update({ workspace_id: newWsId }).eq('id', userId);
      
      // Ensure we also save in localStorage to avoid stale state
      localStorage.setItem('m4_crm_workspace_id', newWsId);
      
      // Also link in workspace_users
      await supabase.from('workspace_users').insert({
        user_id: userId,
        workspace_id: newWsId
      }).maybeSingle();

      return newWsId;
    } catch (error) {
      console.error('workspaceService: Failed to resolve workspace:', error);
      throw error;
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
