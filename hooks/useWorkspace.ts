
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { workspaceService } from '../services/workspaceService';
import { isUUID } from '../lib/mappers';

export function useWorkspace() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(() => {
    const saved = localStorage.getItem('m4_crm_workspace_id');
    return isUUID(saved) ? saved : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function resolve() {
      try {
        if (mounted) setLoading(true);
        
        // 1. Get current Supabase Auth user or fallback to custom login
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const customUserId = localStorage.getItem('m4_crm_user_id');
        const userId = authUser?.id || customUserId;
        
        if (!userId) {
          if (mounted) {
            setWorkspaceId(null);
            setLoading(false);
          }
          return;
        }

        // 2. Resolve Workspace from Supabase
        const wsId = await workspaceService.resolveWorkspaceForUser(userId);
        
        if (mounted && wsId && isUUID(wsId)) {
          setWorkspaceId(wsId);
          localStorage.setItem('m4_crm_workspace_id', wsId);
        }
      } catch (err: any) {
        console.error('useWorkspace: Error resolving workspace:', err);
        if (mounted) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    // Listen for auth changes to re-resolve
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('useWorkspace: Auth event:', event);
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        resolve();
      } else if (event === 'SIGNED_OUT') {
        const customUserId = localStorage.getItem('m4_crm_user_id');
        if (!customUserId) {
          setWorkspaceId(null);
          localStorage.removeItem('m4_crm_workspace_id');
        }
      }
    });

    resolve();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { workspaceId, loading, error };
}
