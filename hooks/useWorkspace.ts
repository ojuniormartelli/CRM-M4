
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { workspaceService } from '../services/workspaceService';
import { isUUID } from '../lib/mappers';

export function useWorkspace() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(localStorage.getItem('m4_crm_workspace_id'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function resolve() {
      try {
        setLoading(true);
        
        // 1. Get current Supabase Auth user
        const { data: { user } } = await supabase.auth.getUser();
        
        // 2. Get local user ID if not using Supabase Auth
        const localUserId = localStorage.getItem('m4_crm_user_id');
        
        const effectiveUserId = user?.id || localUserId;
        
        if (!effectiveUserId) {
          setLoading(false);
          return;
        }

        // 3. Resolve Workspace from Supabase
        const wsId = await workspaceService.resolveWorkspaceForUser(effectiveUserId);
        
        if (wsId && isUUID(wsId)) {
          setWorkspaceId(wsId);
          localStorage.setItem('m4_crm_workspace_id', wsId);
        }
      } catch (err: any) {
        console.error('useWorkspace: Error resolving workspace:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    resolve();
  }, []);

  return { workspaceId, loading, error };
}
