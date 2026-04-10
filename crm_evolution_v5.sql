
-- 🔄 SCRIPT DE ATUALIZAÇÃO v5 (M4 CRM)
-- Alinhamento total com o Modal "Novo Negócio"
-- Remove campos redundantes e unifica telefones

-- 1. Garantimos que os campos novos existam antes de qualquer coisa
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS company_phone text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS company_instagram text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS company_linkedin text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS contact_instagram text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS contact_linkedin text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS company_email text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS contact_notes text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS business_notes text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS proposed_ticket numeric DEFAULT 0;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS service_type text;

-- 2. Migração de dados legados (SEGURO: antes de dar DROP)
-- Se houver dados em whatsapp, movemos para o campo de telefone se este estiver vazio
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_leads' AND column_name='company_whatsapp') THEN
        UPDATE public.m4_leads SET company_phone = company_whatsapp WHERE company_phone IS NULL AND company_whatsapp IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_leads' AND column_name='contact_whatsapp') THEN
        UPDATE public.m4_leads SET contact_phone = contact_whatsapp WHERE contact_phone IS NULL AND contact_whatsapp IS NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_leads' AND column_name='whatsapp') THEN
        UPDATE public.m4_leads SET contact_phone = whatsapp WHERE contact_phone IS NULL AND whatsapp IS NOT NULL;
    END IF;
END $$;

-- 3. Limpeza da tabela m4_leads (Agora sim, após a migração)
ALTER TABLE public.m4_leads DROP COLUMN IF EXISTS company_whatsapp;
ALTER TABLE public.m4_leads DROP COLUMN IF EXISTS contact_whatsapp;
ALTER TABLE public.m4_leads DROP COLUMN IF EXISTS whatsapp;

-- 4. Limpeza de outras tabelas relacionadas
ALTER TABLE public.m4_companies DROP COLUMN IF EXISTS whatsapp;
ALTER TABLE public.m4_contacts DROP COLUMN IF EXISTS whatsapp;
