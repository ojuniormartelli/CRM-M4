
import { createClient } from '@supabase/supabase-js';

// Função para capturar variáveis com os nomes exatos que estão no seu print da Vercel
const getSafeEnv = (key: string): string => {
  try {
    // 1. Tenta nomes padrão do Next.js (conforme seu print)
    const nextKey = `NEXT_PUBLIC_${key}`;
    const nextAltKey = key === 'SUPABASE_ANON_KEY' ? 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY' : '';

    if (typeof window !== 'undefined') {
      const win = window as any;
      return win.process?.env?.[nextKey] || 
             win.process?.env?.[nextAltKey] || 
             win.process?.env?.[key] || 
             '';
    }
  } catch (e) {
    console.warn(`Erro ao ler env ${key}`);
  }
  return '';
};

// Captura as chaves usando os múltiplos formatos possíveis
const supabaseUrl = getSafeEnv('SUPABASE_URL');
const supabaseAnonKey = getSafeEnv('SUPABASE_ANON_KEY');

// Se as chaves não forem encontradas, o cliente ainda é criado para não quebrar o import,
// mas as chamadas falharão graciosamente.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
