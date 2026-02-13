
import { createClient } from '@supabase/supabase-js';

// Substitua estas strings pelas suas credenciais do Supabase
// Se estiver usando variáveis de ambiente: process.env.SUPABASE_URL
const supabaseUrl = process.env.SUPABASE_URL || 'https://sua-url.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'sua-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
