import { useState, useEffect } from 'react';
import { supabase, getSupabaseConfig, isSupabaseConfigured } from '../lib/supabase';
import { workspaceService } from '../services/workspaceService';

export function useWorkspace(enabled: boolean = true) {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function resolve(isInitial = false) {
      // Don't try to resolve workspace if config is missing or invalid
      if (!isSupabaseConfigured()) {
        if (mounted && isInitial) setLoading(false);
        return;
      }

      try {
        if (mounted && isInitial) setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          if (mounted) {
            setWorkspaceId(null);
            if (isInitial) setLoading(false);
          }
          return;
        }

        const wsId = await workspaceService.resolveWorkspaceForUser(user.id);

        if (mounted) {
          setWorkspaceId(wsId ?? null);
        }
      } catch (err: unknown) {
        if (mounted) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (mounted && isInitial) setLoading(false);
      }
    }

    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Skip listener setup if not enabled
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        resolve(false);
      } else if (event === 'SIGNED_OUT') {
        setWorkspaceId(null);
      }
    });

    resolve(true);

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [enabled]);

  return { workspaceId, loading, error };
}
