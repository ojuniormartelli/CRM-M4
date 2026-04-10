
-- Migration to add missing columns for CRM enhancements
-- Adding email to m4_companies
ALTER TABLE public.m4_companies ADD COLUMN IF NOT EXISTS email text;

-- Adding whatsapp to m4_leads
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS whatsapp text;

-- Ensure m4_contacts has whatsapp (it already has whatsapp based on previous view)
