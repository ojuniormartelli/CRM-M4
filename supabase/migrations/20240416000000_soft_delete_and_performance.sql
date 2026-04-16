-- 1. Soft Delete Implementation
-- Add deleted_at column to m4_leads and m4_companies
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.m4_companies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Performance Optimization (GIN Indexes)
-- Note: Requires pg_trgm extension for trigram search which is common in CRM search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Leads indexes for company_name and company_website
CREATE INDEX IF NOT EXISTS idx_m4_leads_company_name_trgm ON public.m4_leads USING gin (company_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_m4_leads_company_website_trgm ON public.m4_leads USING gin (company_website gin_trgm_ops);

-- Companies indexes for name and website
CREATE INDEX IF NOT EXISTS idx_m4_companies_name_trgm ON public.m4_companies USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_m4_companies_website_trgm ON public.m4_companies USING gin (website gin_trgm_ops);
