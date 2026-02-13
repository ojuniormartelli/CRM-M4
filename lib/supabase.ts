
import { createClient } from '@supabase/supabase-js';

// Função para obter variáveis de ambiente de forma segura no navegador
const getEnv = (key: string) => {
  try {
    return (window as any).process?.env?.[key] || (import.meta as any).env?.[key] || '';
  } catch {
    return '';
  }
};

const supabaseUrl = getEnv('SUPABASE_URL') || 'https://placeholder.supabase.co';
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || 'placeholder';

// O cliente é criado mesmo com placeholders para evitar erros de importação, 
// mas as chamadas falharão graciosamente.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
