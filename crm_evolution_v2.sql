
-- Migration to add missing columns for CRM enhancements
-- Adding email and linkedin to m4_companies
ALTER TABLE public.m4_companies ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.m4_companies ADD COLUMN IF NOT EXISTS linkedin text;

-- Adding whatsapp and linkedin to m4_leads
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS linkedin text;

-- Ensure m4_contacts has linkedin (it already has instagram and whatsapp based on previous view)
ALTER TABLE public.m4_contacts ADD COLUMN IF NOT EXISTS linkedin text;
