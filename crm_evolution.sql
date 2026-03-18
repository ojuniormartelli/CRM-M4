-- SQL Migration Script for CRM Evolution
-- Run this in your Supabase SQL Editor

-- 1. Create Companies table if not exists
CREATE TABLE IF NOT EXISTS public.m4_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj text,
  city text,
  state text,
  segment text,
  website text,
  instagram text,
  phone text,
  whatsapp text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Create Contacts table if not exists
CREATE TABLE IF NOT EXISTS public.m4_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.m4_companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  email text,
  phone text,
  whatsapp text,
  instagram text,
  linkedin text,
  notes text,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Update m4_leads (Deals) to link with Companies and Contacts
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.m4_companies(id);
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.m4_contacts(id);

-- 4. Update m4_client_accounts to link with Companies
ALTER TABLE public.m4_client_accounts ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.m4_companies(id);

-- 5. Update m4_tasks to link with Companies and Deals
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.m4_companies(id);
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.m4_leads(id);

-- 6. Update m4_transactions to link with Companies and Deals
ALTER TABLE public.m4_transactions ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.m4_companies(id);
ALTER TABLE public.m4_transactions ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.m4_leads(id);

-- 7. Update m4_emails to link with Companies and Contacts
ALTER TABLE public.m4_emails ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.m4_companies(id);
ALTER TABLE public.m4_emails ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.m4_contacts(id);
ALTER TABLE public.m4_emails ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.m4_leads(id);
