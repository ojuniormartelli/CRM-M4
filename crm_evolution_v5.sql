
-- 🔄 SCRIPT DE ATUALIZAÇÃO v5 (M4 CRM)
-- Alinhamento total com o Modal "Novo Negócio"
-- Remove campos redundantes e unifica telefones

-- 1. Limpeza da tabela m4_leads
-- Removemos campos de WhatsApp separados e nomes genéricos
ALTER TABLE public.m4_leads DROP COLUMN IF EXISTS company_whatsapp;
ALTER TABLE public.m4_leads DROP COLUMN IF EXISTS contact_whatsapp;
ALTER TABLE public.m4_leads DROP COLUMN IF EXISTS whatsapp;

-- Garantimos que os campos unificados existam
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS company_phone text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS contact_phone text;

-- 2. Migração de dados (opcional, mas recomendado se houver dados)
-- Se houver dados em whatsapp, movemos para o campo de telefone se este estiver vazio
UPDATE public.m4_leads SET company_phone = company_whatsapp WHERE company_phone IS NULL AND company_whatsapp IS NOT NULL;
UPDATE public.m4_leads SET contact_phone = contact_whatsapp WHERE contact_phone IS NULL AND contact_whatsapp IS NOT NULL;

-- 3. Limpeza de outras tabelas relacionadas
ALTER TABLE public.m4_companies DROP COLUMN IF EXISTS whatsapp;
ALTER TABLE public.m4_contacts DROP COLUMN IF EXISTS whatsapp;

-- 4. Adição de campos faltantes no modal
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS company_email text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS contact_instagram text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS contact_linkedin text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS contact_notes text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS business_notes text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS proposed_ticket numeric DEFAULT 0;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS service_type text;
