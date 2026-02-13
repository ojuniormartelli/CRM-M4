
import { createClient } from '@supabase/supabase-js';

// Função ultra-segura para capturar variáveis de ambiente sem crashar o navegador
const getSafeEnv = (key: string): string => {
  try {
    // Tenta primeiro via process.env global shimmed no index.html ou injetado por bundler
    if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
      return (window as any).process.env[key];
    }
    // Tenta via process.env padrão Node
    if (typeof process !== 'undefined' && process?.env?.[key]) {
      return process.env[key] as string;
    }
    // Tenta via import.meta.env (Vite/ESM)
    if (typeof (import.meta as any).env !== 'undefined' && (import.meta as any).env[key]) {
      return (import.meta as any).env[key];
    }
  } catch (e) {
    console.warn(`Tentativa de leitura da variável ${key} falhou:`, e);
  }
  return '';
};

const supabaseUrl = getSafeEnv('SUPABASE_URL') || 'https://placeholder-none.supabase.co';
const supabaseAnonKey = getSafeEnv('SUPABASE_ANON_KEY') || 'placeholder-none';

// Criação resiliente do cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
