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
      
      // Return simulated 503 Response to stop unhandled TypeErrors from cluttering console inside iframe preview
      if (typeof Response !== 'undefined') {
        return new Response(
          JSON.stringify({
            error: {
              message: "Failed to fetch (AdBlock/Connection blocked)",
              details: err?.message || String(err)
            }
          }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
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

// Resilient fallback logic for missing task columns on legacy databases
function isMissingColumnError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || String(error)).toLowerCase();
  return (
    msg.includes('interaction_note') || 
    msg.includes('interaction_success') || 
    msg.includes('type') || 
    msg.includes('task_type') ||
    msg.includes('schema cache') ||
    error.code === '42703' || 
    error.code === 'PGRST204' ||
    (msg.includes('column') && msg.includes('does not exist'))
  );
}

function getMissingColumnName(error: any): string | null {
  if (!error) return null;
  const msg = error.message || String(error);
  
  // PostgREST message: "Could not find the 'type' column of 'm4_tasks' in the schema cache"
  const match1 = msg.match(/'([^']+)' column/i);
  if (match1) return match1[1];
  
  // Postgres standard: "column \"type\" of relation \"m4_tasks\" does not exist"
  const match2 = msg.match(/column "([^"]+)"/i);
  if (match2) return match2[1];
  
  // Another variant: "column 'type' of relation..."
  const match3 = msg.match(/column '([^']+)'/i);
  if (match3) return match3[1];
  
  return null;
}

function wrapPostgrestBuilder(
  builder: any, 
  getCleanBuilder: (strippedColumns: Set<string>) => any, 
  strippedColumns = new Set<string>()
): any {
  const originalThen = builder.then;
  builder.then = function(onfulfilled: any, onrejected: any) {
    return originalThen.call(builder, 
      async (result: any) => {
        if (result && result.error && isMissingColumnError(result.error)) {
          const missingColumn = getMissingColumnName(result.error);
          const columnToStrip = missingColumn || 'type'; // Fallback to 'type' if undetermined
          
          if (!strippedColumns.has(columnToStrip)) {
            const updatedStripped = new Set(strippedColumns);
            updatedStripped.add(columnToStrip);
            console.warn(`[Supabase Fallback] Missing column '${columnToStrip}' detected. Retrying query without it...`, result.error);
            try {
              const cleanBuilder = getCleanBuilder(updatedStripped);
              return cleanBuilder.then(onfulfilled, onrejected);
            } catch (retryErr) {
              if (onfulfilled) return onfulfilled({ error: retryErr });
            }
          }
        }
        if (onfulfilled) return onfulfilled(result);
        return result;
      },
      async (error: any) => {
        if (isMissingColumnError(error)) {
          const missingColumn = getMissingColumnName(error);
          const columnToStrip = missingColumn || 'type'; // Fallback to 'type'
          
          if (!strippedColumns.has(columnToStrip)) {
            const updatedStripped = new Set(strippedColumns);
            updatedStripped.add(columnToStrip);
            console.warn(`[Supabase Fallback Exception] Missing column '${columnToStrip}' detected. Retrying query without it...`, error);
            try {
              const cleanBuilder = getCleanBuilder(updatedStripped);
              return cleanBuilder.then(onfulfilled, onrejected);
            } catch (retryErr) {
              if (onrejected) return onrejected(retryErr);
              throw retryErr;
            }
          }
        }
        if (onrejected) return onrejected(error);
        throw error;
      }
    );
  };

  const chainMethods = ['select', 'order', 'limit', 'single', 'eq', 'neq', 'gt', 'lt', 'match', 'or', 'csv', 'geojson'];
  chainMethods.forEach(method => {
    if (typeof builder[method] === 'function') {
      const originalMethod = builder[method];
      builder[method] = function(...args: any[]) {
        const nextBuilder = originalMethod.apply(builder, args);
        return wrapPostgrestBuilder(nextBuilder, (updatedStripped) => {
          const baseCleanBuilder = getCleanBuilder(updatedStripped);
          if (typeof baseCleanBuilder[method] === 'function') {
            return baseCleanBuilder[method](...args);
          }
          return baseCleanBuilder;
        }, strippedColumns);
      };
    }
  });

  return builder;
}

function patchSupabaseInstance(client: SupabaseClient) {
  const originalFrom = client.from;
  client.from = function(relation: string) {
    if (relation === 'm4_tasks') {
      const originalBuilder = originalFrom.call(client, relation);
      
      const originalInsert = originalBuilder.insert;
      originalBuilder.insert = function(values: any, options: any) {
        const resultBuilder = originalInsert.call(originalBuilder, values, options);
        return wrapPostgrestBuilder(resultBuilder, (strippedCols) => {
          const cleanSingleValue = (v: any) => {
            const copy = { ...v };
            
            // Default preset column restrictions for legacy DB compatibility
            if (strippedCols.size === 0) {
              // Proactively remove obvious potential ones if we already detected schema issues,
              // or wait for dynamic detection. To be safest, we strip dynamically.
            }
            
            strippedCols.forEach(col => {
              delete copy[col];
            });
            return copy;
          };

          const cleanValues = Array.isArray(values)
            ? values.map(cleanSingleValue)
            : cleanSingleValue(values);
          
          const freshBuilder = originalFrom.call(client, relation);
          return freshBuilder.insert(cleanValues, options);
        });
      };

      const originalUpdate = originalBuilder.update;
      originalBuilder.update = function(values: any, options: any) {
        const resultBuilder = originalUpdate.call(originalBuilder, values, options);
        return wrapPostgrestBuilder(resultBuilder, (strippedCols) => {
          const copy = { ...values };
          strippedCols.forEach(col => {
            delete copy[col];
          });
          
          const freshBuilder = originalFrom.call(client, relation);
          return freshBuilder.update(copy, options);
        });
      };

      return originalBuilder;
    }
    return originalFrom.call(client, relation);
  };
}

patchSupabaseInstance(supabase);

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
  patchSupabaseInstance(supabase);
  return supabase;
}
