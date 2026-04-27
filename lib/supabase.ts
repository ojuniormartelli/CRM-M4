import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface SupabaseConfig {
  url: string;
  key: string;
  isCustom: boolean;
}

/**
 * Resolve Supabase config.
 * Priority: env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 * Fallback: localStorage keys set via Setup screen (custom deployments only).
 */
export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (envUrl && envKey) {
    return { url: envUrl, key: envKey, isCustom: false };
  }

  // Fallback to localStorage (Setup screen)
  const localUrl = localStorage.getItem('supabase_url');
  const localKey = localStorage.getItem('supabase_anon_key');

  if (localUrl && localKey) {
    return { url: localUrl, key: localKey, isCustom: true };
  }

  return { url: '', key: '', isCustom: false };
}

const config = getSupabaseConfig();

export let supabase: SupabaseClient = createClient(
  config.url || 'https://placeholder.supabase.co',
  config.key || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

/**
 * Re-initialize the Supabase client after Setup screen saves new credentials.
 */
export function updateSupabaseClient(url: string, key: string): SupabaseClient {
  supabase = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return supabase;
}
