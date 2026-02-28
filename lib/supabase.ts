
import { createClient } from '@supabase/supabase-js';

// Captura as chaves usando os múltiplos formatos possíveis
// Suporta tanto o padrão Vite (VITE_) quanto o padrão Next.js/Vercel (NEXT_PUBLIC_)
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  '';

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 
  '';

// Se as chaves não forem encontradas, o cliente ainda é criado para não quebrar o import,
// mas as chamadas falharão graciosamente.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
