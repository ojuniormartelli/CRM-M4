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

  // Se não houver configuração, não use o placeholder como URL válido
  return { url: '', key: '', isCustom: false };
}

const config = getSupabaseConfig();
const IS_CONFIGURED = !!config.url && config.url !== 'https://placeholder.supabase.co';

console.log('[Supabase] Init:', IS_CONFIGURED ? config.url : 'UNCONFIGURED');

// Custom fetch wrapper to detect and diagnose network errors (like AdBlock)
const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (err: any) {
    const urlStr = typeof url === 'string' ? url : (url as Request).url || String(url);
    
    if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError' || err?.message?.includes('net::ERR')) {
      // Differentiate between real network error and potential AdBlock
      console.warn(`[Supabase Fetch Warning] Connection issue/block detected for URL: ${urlStr}`);
      console.warn('[Supabase Fetch Warning] Details:', err);
    }
    throw err;
  }
};

export let supabase: SupabaseClient = createClient(
  config.url || 'https://no-config-yet.invalid',
  config.key || 'no-key',
  {
    global: {
      fetch: customFetch
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Workaround for Navigator Lock timeout in iframes
      lock: async (name: string, ...args: any[]) => {
        // ALWAYS bypass the lock in iframe environments to prevent LockManager timeouts
        // By assigning the result of the acquire callback directly, we avoid the Navigator Lock API entirely
        try {
          // Identify the acquire callback across potential library version differences
          // It's usually the second or third argument
          const acquireCallback = args.find(arg => typeof arg === 'function');

          if (acquireCallback) {
            return await (acquireCallback as () => Promise<any>)();
          }
          
          return Promise.resolve();
        } catch (error) {
          console.error('[Supabase Lock Bypass] Failed to execute acquire callback:', error);
          return Promise.resolve();
        }
      },
    },
  }
);

export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return !!config.url && config.url !== 'https://placeholder.supabase.co' && !config.url.includes('no-config-yet.invalid');
}

export function diagnoseSupabaseError(err: any): { title: string; message: string; type: 'blocked' | 'config' | 'auth' | 'other' } {
  const msg = err?.message || String(err);
  
  if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('net::err') || msg.includes('CONEXAO_BLOQUEADA')) {
    return {
      title: 'Conexão Bloqueada',
      message: 'A requisição ao Supabase foi bloqueada pelo seu navegador. Isso acontece quando AdBlockers (uBlock, AdBlock Plus) ou Firewalls entendem o domínio do banco de dados como rastreador.',
      type: 'blocked'
    };
  }
  
  if (msg.includes('Auth session missing')) {
    return {
      title: 'Sessão Expirada',
      message: 'Sua sessão de login expirou ou não foi encontrada. Por favor, faça login novamente.',
      type: 'auth'
    };
  }

  if (msg.includes('invalid') || msg.includes('no-config')) {
    return {
      title: 'Configuração Inválida',
      message: 'As credenciais do Supabase não estão configuradas corretamente.',
      type: 'config'
    };
  }

  return {
    title: 'Erro de Conexão',
    message: msg,
    type: 'other'
  };
}

/**
 * Re-initialize the Supabase client after Setup screen saves new credentials.
 */
export function updateSupabaseClient(url: string, key: string): SupabaseClient {
  console.log('[Supabase] Atualizando cliente com URL:', url);
  supabase = createClient(url, key, {
    global: {
      fetch: customFetch
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      lock: async (name: string, acquireTimeout: number, ...rest: any[]) => {
        console.log('[Supabase Lock] Bypassing lock (updated) for:', name);
        try {
          const foundCallback = [acquireTimeout, ...rest].find(arg => typeof arg === 'function');
          if (foundCallback) {
            return await (foundCallback as () => Promise<any>)();
          }
          return Promise.resolve();
        } catch (error) {
          console.error('[Supabase Lock Bypass] Execution error:', error);
          return Promise.resolve();
        }
      },
    },
  });
  return supabase;
}
