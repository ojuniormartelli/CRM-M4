-- 🛠️ MIGRATION: IMPLEMENTAÇÃO DEFINITIVA DE SOFT DELETE
-- Este script garante que todas as tabelas tenham a coluna deleted_at e políticas RLS atualizadas.

DO $$ 
BEGIN
    -- 1. Adicionar coluna deleted_at se não existir
    ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE public.m4_companies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE public.m4_contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE public.m4_clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE public.m4_projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

    -- 2. Índices para performance nas queries filtradas (WHERE deleted_at IS NULL)
    CREATE INDEX IF NOT EXISTS idx_m4_leads_deleted_at ON public.m4_leads(deleted_at) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_m4_tasks_deleted_at ON public.m4_tasks(deleted_at) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_m4_clients_deleted_at ON public.m4_clients(deleted_at) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_m4_companies_deleted_at ON public.m4_companies(deleted_at) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_m4_contacts_deleted_at ON public.m4_contacts(deleted_at) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_m4_projects_deleted_at ON public.m4_projects(deleted_at) WHERE deleted_at IS NULL;

    -- 3. Atualização de Políticas RLS (Soft Delete)
    -- Este bloco garante que as políticas Workspace Access filtrem registros deletados
    DECLARE
        t text;
        has_deleted_at boolean;
    BEGIN
        FOR t IN (
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename LIKE 'm4_%' 
            AND tablename NOT IN ('m4_workspaces', 'm4_users', 'm4_workspace_users')
        ) LOOP
            -- Recria a política se a tabela tiver deleted_at
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = t AND column_name = 'deleted_at'
            ) INTO has_deleted_at;

            EXECUTE format('DROP POLICY IF EXISTS "Workspace Access" ON %I', t);

            IF has_deleted_at THEN
                EXECUTE format('
                    CREATE POLICY "Workspace Access" ON %I 
                    FOR ALL 
                    TO authenticated 
                    USING (workspace_id = public.get_current_workspace_id() AND deleted_at IS NULL)
                    WITH CHECK (workspace_id = public.get_current_workspace_id())
                ', t);
            ELSE
                EXECUTE format('
                    CREATE POLICY "Workspace Access" ON %I 
                    FOR ALL 
                    TO authenticated 
                    USING (workspace_id = public.get_current_workspace_id())
                    WITH CHECK (workspace_id = public.get_current_workspace_id())
                ', t);
            END IF;
        END LOOP;
    END;

    -- 4. Comentários para documentação
    COMMENT ON COLUMN public.m4_leads.deleted_at IS 'Data/Hora da exclusão lógica (soft delete)';
    COMMENT ON COLUMN public.m4_tasks.deleted_at IS 'Data/Hora da exclusão lógica (soft delete)';
    COMMENT ON COLUMN public.m4_clients.deleted_at IS 'Data/Hora da exclusão lógica (soft delete)';
    COMMENT ON COLUMN public.m4_companies.deleted_at IS 'Data/Hora da exclusão lógica (soft delete)';
    COMMENT ON COLUMN public.m4_contacts.deleted_at IS 'Data/Hora da exclusão lógica (soft delete)';
    COMMENT ON COLUMN public.m4_projects.deleted_at IS 'Data/Hora da exclusão lógica (soft delete)';

END $$;
