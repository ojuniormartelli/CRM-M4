-- 🛠️ CORREÇÃO: Adicionando colunas faltantes na tabela m4_settings
-- Este script corrige o erro de "coluna não encontrada" ao salvar as configurações.

ALTER TABLE public.m4_settings 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Adicionar coluna de histórico de edição na tabela m4_fin_transactions
ALTER TABLE public.m4_fin_transactions 
ADD COLUMN IF NOT EXISTS edit_history TEXT;

-- Garantir que as colunas de saldo existem em m4_fin_bank_accounts
ALTER TABLE public.m4_fin_bank_accounts 
ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_balance NUMERIC DEFAULT 0;

-- Garantir que as permissões continuam corretas
GRANT ALL ON public.m4_settings TO anon, authenticated;
GRANT ALL ON public.m4_fin_transactions TO anon, authenticated;
GRANT ALL ON public.m4_fin_bank_accounts TO anon, authenticated;
