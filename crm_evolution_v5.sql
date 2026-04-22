
-- 🔄 SCRIPT DE ATUALIZAÇÃO v5 (M4 CRM)
-- Alinhamento total com a solicitação do usuário: Priorizar WhatsApp e Remover Telefone
-- Esta migração unifica os campos de telefone no campo WhatsApp

-- 1. Garantimos que os campos base de WhatsApp existam
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS company_whatsapp text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS contact_whatsapp text;
ALTER TABLE public.m4_companies ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.m4_contacts ADD COLUMN IF NOT EXISTS whatsapp text;

-- 2. Migração de dados legados
-- Movemos dados de phone para whatsapp se o whatsapp estiver vazio
DO $$ 
BEGIN
    -- M4_LEADS
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_leads' AND column_name='company_phone') THEN
        UPDATE public.m4_leads SET company_whatsapp = company_phone WHERE company_whatsapp IS NULL AND company_phone IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_leads' AND column_name='contact_phone') THEN
        UPDATE public.m4_leads SET contact_whatsapp = contact_phone WHERE contact_whatsapp IS NULL AND contact_phone IS NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_leads' AND column_name='phone') THEN
        UPDATE public.m4_leads SET contact_whatsapp = phone WHERE contact_whatsapp IS NULL AND phone IS NOT NULL;
    END IF;

    -- M4_COMPANIES
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_companies' AND column_name='phone') THEN
        UPDATE public.m4_companies SET whatsapp = phone WHERE whatsapp IS NULL AND phone IS NOT NULL;
    END IF;

    -- M4_CONTACTS
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_contacts' AND column_name='phone') THEN
        UPDATE public.m4_contacts SET whatsapp = phone WHERE whatsapp IS NULL AND phone IS NOT NULL;
    END IF;
END $$;

-- 3. Limpeza Final: Remove as colunas 'phone' de todas as tabelas
ALTER TABLE public.m4_leads DROP COLUMN IF EXISTS company_phone;
ALTER TABLE public.m4_leads DROP COLUMN IF EXISTS contact_phone;
ALTER TABLE public.m4_leads DROP COLUMN IF EXISTS phone;

ALTER TABLE public.m4_companies DROP COLUMN IF EXISTS phone;
ALTER TABLE public.m4_contacts DROP COLUMN IF EXISTS phone;
