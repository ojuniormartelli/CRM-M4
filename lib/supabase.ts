
import { createClient } from '@supabase/supabase-js';

// Captura as chaves usando os múltiplos formatos possíveis (Vite usa import.meta.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Se as chaves não forem encontradas, o cliente ainda é criado para não quebrar o import,
// mas as chamadas falharão graciosamente.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
