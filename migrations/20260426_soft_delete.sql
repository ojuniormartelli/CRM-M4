
-- 🛠️ MIGRATION: IMPLEMENTAÇÃO DE SOFT DELETE
-- Adicionando deleted_at para as tabelas que ainda não possuem

ALTER TABLE public.m4_clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.m4_contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.m4_projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Índices para performance nas queries filtradas
CREATE INDEX IF NOT EXISTS idx_m4_leads_deleted_at ON public.m4_leads(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_m4_tasks_deleted_at ON public.m4_tasks(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_m4_clients_deleted_at ON public.m4_clients(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_m4_companies_deleted_at ON public.m4_companies(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_m4_contacts_deleted_at ON public.m4_contacts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_m4_projects_deleted_at ON public.m4_projects(deleted_at) WHERE deleted_at IS NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.m4_leads.deleted_at IS 'Data/Hora da exclusão lógica (soft delete)';
COMMENT ON COLUMN public.m4_tasks.deleted_at IS 'Data/Hora da exclusão lógica (soft delete)';
COMMENT ON COLUMN public.m4_clients.deleted_at IS 'Data/Hora da exclusão lógica (soft delete)';
COMMENT ON COLUMN public.m4_companies.deleted_at IS 'Data/Hora da exclusão lógica (soft delete)';
