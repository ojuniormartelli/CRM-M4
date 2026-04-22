
import { createClient } from '@supabase/supabase-js';

// Função para obter as configurações do Supabase (localStorage ou env)
export const getSupabaseConfig = () => {
  const localUrl = localStorage.getItem('supabase_url');
  const localKey = localStorage.getItem('supabase_anon_key');

  if (localUrl && localKey) {
    return {
      url: localUrl,
      key: localKey,
      isCustom: true
    };
  }

  return {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    key: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    isCustom: false
  };
};

const config = getSupabaseConfig();

// Se as chaves não forem encontradas, o cliente ainda é criado para não quebrar o import,
// mas as chamadas falharão graciosamente.
export let supabase = createClient(
  config.url || 'https://placeholder.supabase.co', 
  config.key || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

// Função para re-inicializar o cliente quando as configurações mudarem
export const updateSupabaseClient = (url: string, key: string) => {
  supabase = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  });
  return supabase;
};
