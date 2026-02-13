
import { createClient } from '@supabase/supabase-js';

// Função ultra-segura para capturar variáveis de ambiente sem crashar o navegador
const getSafeEnv = (key: string): string => {
  try {
    // Tenta primeiro via process.env (Vercel/Node polyfills)
    if (typeof process !== 'undefined' && process && process.env && process.env[key]) {
      return process.env[key] as string;
    }
    // Tenta via import.meta.env (Vite/ESM)
    if (typeof (import.meta as any).env !== 'undefined' && (import.meta as any).env[key]) {
      return (import.meta as any).env[key];
    }
  } catch (e) {
    console.warn(`Erro ao tentar ler variável de ambiente: ${key}`);
  }
  return '';
};

const supabaseUrl = getSafeEnv('SUPABASE_URL') || 'https://placeholder.supabase.co';
const supabaseAnonKey = getSafeEnv('SUPABASE_ANON_KEY') || 'placeholder';

// O cliente é criado de forma resiliente
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
