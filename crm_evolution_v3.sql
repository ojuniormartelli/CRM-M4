
-- Migration v3: Add missing columns for enhanced lead data
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS company_whatsapp text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS company_instagram text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS company_linkedin text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS contact_whatsapp text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS contact_instagram text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS contact_linkedin text;

-- Ensure m4_companies has whatsapp (it was in schema but let's be sure)
ALTER TABLE public.m4_companies ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.m4_companies ADD COLUMN IF NOT EXISTS instagram text;

-- Ensure m4_contacts has whatsapp and instagram
ALTER TABLE public.m4_contacts ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.m4_contacts ADD COLUMN IF NOT EXISTS instagram text;
