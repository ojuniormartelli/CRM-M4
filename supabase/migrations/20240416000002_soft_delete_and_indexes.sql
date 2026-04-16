
-- 🛡️ MELHORIAS DE PERFORMANCE E ESTRUTURA (SOFT DELETE & INDEXES)

-- 1. Extensão para busca textual avançada (Trigram)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Adição de colunas para Soft Delete
-- Leads
ALTER TABLE public.m4_leads 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Companies
ALTER TABLE public.m4_companies 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 3. Criação de Índices GIN para busca textual otimizada
-- O CRM realiza muitas buscas por nome da empresa e domínio (website)
-- O índice GIN com pg_trgm permite buscas parciais (LIKE '%termo%') extremamente rápidas

-- Leads: Nome da Empresa (coluna 'company') e Website (coluna 'website')
CREATE INDEX IF NOT EXISTS idx_m4_leads_company_trgm ON public.m4_leads USING GIN (company gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_m4_leads_website_trgm ON public.m4_leads USING GIN (website gin_trgm_ops);

-- Companies: Nome e Website
CREATE INDEX IF NOT EXISTS idx_m4_companies_name_trgm ON public.m4_companies USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_m4_companies_website_trgm ON public.m4_companies USING GIN (website gin_trgm_ops);

-- 4. Índices B-Tree para filtragem rápida de Soft Delete
CREATE INDEX IF NOT EXISTS idx_m4_leads_deleted_at ON public.m4_leads (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_m4_companies_deleted_at ON public.m4_companies (deleted_at) WHERE deleted_at IS NULL;
