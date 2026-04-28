-- =========================================================
-- DATABASE_COMPLETE_INSTALL.sql
-- Arquivo estrutural oficial do banco do M4 CRM
-- =========================================================
-- Este é o único script autorizado para instalação completa
-- em novos ambientes Supabase/PostgreSQL.
--
-- Contém:
-- - enums
-- - funções
-- - trigger auth.users -> m4_users
-- - tabelas estruturais
-- - RLS
-- - grants
-- - seeds estruturais mínimas
--
-- Não incluir aqui:
-- - dados de demonstração
-- - patches antigos
-- - correções incrementais soltas
-- =========================================================

BEGIN;

-- =========================================================
-- 1. ENUMS
-- =========================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fin_transaction_type') THEN
    CREATE TYPE fin_transaction_type AS ENUM ('income', 'expense', 'transfer', 'adjustment');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fin_transaction_status') THEN
    CREATE TYPE fin_transaction_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'canceled');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fin_category_type') THEN
    CREATE TYPE fin_category_type AS ENUM ('income', 'expense', 'both');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fin_classification_type') THEN
    CREATE TYPE fin_classification_type AS ENUM ('operacional', 'nao_operacional', 'financeiro', 'tributario');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fin_counterparty_type') THEN
    CREATE TYPE fin_counterparty_type AS ENUM ('cliente', 'fornecedor', 'colaborador', 'parceiro', 'outro');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fin_bank_account_type') THEN
    CREATE TYPE fin_bank_account_type AS ENUM ('checking', 'savings', 'cash', 'credit_account', 'investment');
  END IF;
END
$$;

-- =========================================================
-- 2. FUNÇÕES
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_current_workspace_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_workspace_id UUID;
BEGIN
    SELECT u.workspace_id
      INTO v_workspace_id
      FROM public.m4_users u
     WHERE u.id = auth.uid()
     LIMIT 1;

    IF v_workspace_id IS NOT NULL THEN
        RETURN v_workspace_id;
    END IF;

    SELECT wu.workspace_id
      INTO v_workspace_id
      FROM public.m4_workspace_users wu
     WHERE wu.user_id = auth.uid()
     LIMIT 1;

    RETURN v_workspace_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  default_ws_id UUID := 'fb786658-1234-4321-8888-999988887777';
  user_count INTEGER;
BEGIN
  SELECT count(*) INTO user_count FROM public.m4_users;

  IF user_count = 0 THEN
    INSERT INTO public.m4_workspaces (id, name)
    VALUES (default_ws_id, 'Workspace Principal')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  INSERT INTO public.m4_users (
    id,
    name,
    email,
    workspace_id,
    role,
    status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    default_ws_id,
    CASE WHEN user_count = 0 THEN 'owner' ELSE 'user' END,
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();

  INSERT INTO public.m4_workspace_users (workspace_id, user_id, role)
  VALUES (
    default_ws_id,
    NEW.id,
    CASE WHEN user_count = 0 THEN 'owner' ELSE 'member' END
  )
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro no trigger handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- =========================================================
-- 3. TABELAS CORE
-- =========================================================

CREATE TABLE IF NOT EXISTS public.m4_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    branding_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_job_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level INTEGER DEFAULT 10,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_users (
    id UUID PRIMARY KEY,
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'user')),
    job_role_id UUID REFERENCES public.m4_job_roles(id) ON DELETE SET NULL,
    avatar_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    must_change_password BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_workspace_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.m4_users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.m4_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE UNIQUE,
    crm_name TEXT DEFAULT 'M4 CRM',
    company_name TEXT DEFAULT 'Agency Cloud',
    cnpj TEXT,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#2563eb',
    theme TEXT DEFAULT 'light',
    language TEXT DEFAULT 'pt-BR',
    email TEXT,
    phone TEXT,
    website TEXT,
    zip_code TEXT,
    address TEXT,
    address_number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================
-- 4. TABELAS CRM
-- =========================================================

CREATE TABLE IF NOT EXISTS public.m4_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES public.m4_pipelines(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT 'blue',
    position INTEGER DEFAULT 0,
    status TEXT DEFAULT 'intermediario',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cnpj TEXT,
    website TEXT,
    niche TEXT,
    email TEXT,
    whatsapp TEXT,
    city TEXT,
    state TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.m4_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.m4_companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    email TEXT,
    whatsapp TEXT,
    linkedin TEXT,
    notes TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.m4_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    pipeline_id UUID REFERENCES public.m4_pipelines(id) ON DELETE SET NULL,
    stage_id UUID REFERENCES public.m4_pipeline_stages(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.m4_companies(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.m4_contacts(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active',
    contact_name TEXT,
    contact_email TEXT,
    contact_whatsapp TEXT,
    value DECIMAL(12, 2) DEFAULT 0,
    temperature TEXT DEFAULT 'Frio',
    probability INTEGER DEFAULT 0,
    source TEXT,
    next_action TEXT,
    next_action_date DATE,
    responsible_id UUID REFERENCES public.m4_users(id) ON DELETE SET NULL,
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    custom_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.m4_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.m4_companies(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.m4_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.m4_leads(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.m4_companies(id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    manager_id UUID REFERENCES public.m4_users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active',
    contract_start_date DATE,
    monthly_value DECIMAL(12, 2) DEFAULT 0,
    services JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.m4_client_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.m4_companies(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.m4_leads(id) ON DELETE SET NULL,
    service_name TEXT,
    service_type TEXT,
    monthly_value DECIMAL(12, 2) DEFAULT 0,
    due_day INTEGER,
    status TEXT DEFAULT 'ativo',
    start_date DATE,
    billing_model TEXT DEFAULT 'recorrente',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.m4_clients(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.m4_leads(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.m4_companies(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Pendente',
    priority TEXT DEFAULT 'Media',
    due_date TIMESTAMPTZ,
    assigned_to UUID REFERENCES public.m4_users(id) ON DELETE SET NULL,
    task_type TEXT DEFAULT 'operational',
    is_recurring BOOLEAN DEFAULT false,
    checklist JSONB DEFAULT '[]'::jsonb,
    actual_hours NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.m4_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    default_price DECIMAL(12, 2) DEFAULT 0,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.m4_companies(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.m4_contacts(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.m4_leads(id) ON DELETE SET NULL,
    subject TEXT,
    body TEXT,
    folder TEXT DEFAULT 'inbox',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT,
    status TEXT DEFAULT 'Agendada',
    sent_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    user_name TEXT,
    content TEXT,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================
-- 5. TABELAS FINANCEIRO
-- =========================================================

CREATE TABLE IF NOT EXISTS public.m4_fin_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type fin_category_type NOT NULL DEFAULT 'both',
    parent_id UUID REFERENCES public.m4_fin_categories(id) ON DELETE CASCADE,
    classification_type fin_classification_type DEFAULT 'operacional',
    impacts_dre BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_counterparties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type fin_counterparty_type DEFAULT 'outro',
    document TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type fin_bank_account_type DEFAULT 'checking',
    current_balance NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.m4_fin_categories(id),
    bank_account_id UUID REFERENCES public.m4_fin_bank_accounts(id),
    cost_center_id UUID REFERENCES public.m4_fin_cost_centers(id),
    counterparty_id UUID REFERENCES public.m4_fin_counterparties(id),
    type fin_transaction_type NOT NULL,
    status fin_transaction_status DEFAULT 'pending',
    amount NUMERIC NOT NULL,
    description TEXT NOT NULL,
    due_date DATE NOT NULL,
    competence_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.m4_fin_categories(id) ON DELETE CASCADE,
    period TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================
-- 6. AUTOMAÇÕES E METAS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.m4_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    actions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    automation_id UUID REFERENCES public.m4_automations(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    target_value DECIMAL(15,2) DEFAULT 0,
    current_value DECIMAL(15,2) DEFAULT 0,
    type TEXT DEFAULT 'sales',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, month, type)
);

-- =========================================================
-- 7. RLS
-- =========================================================

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename LIKE 'm4_%'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END
$$;

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename LIKE 'm4_%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_insert ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_update ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_delete ON public.%I', t, t);
    END LOOP;

    DROP POLICY IF EXISTS m4_workspaces_select ON public.m4_workspaces;
    DROP POLICY IF EXISTS m4_users_select ON public.m4_users;
    DROP POLICY IF EXISTS m4_users_update ON public.m4_users;
    DROP POLICY IF EXISTS m4_workspace_users_select ON public.m4_workspace_users;
END
$$;

DO $$
DECLARE
    t text;
    has_deleted_at boolean;
BEGIN
    FOR t IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename LIKE 'm4_%'
          AND tablename NOT IN ('m4_workspaces', 'm4_users', 'm4_workspace_users')
    LOOP
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = t
              AND column_name = 'deleted_at'
        )
        INTO has_deleted_at;

        -- Drop existing policies first
        EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_insert ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_update ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_delete ON public.%I', t, t);

        IF has_deleted_at THEN
            EXECUTE format(
                'CREATE POLICY %I_select ON public.%I
                 FOR SELECT TO authenticated
                 USING (workspace_id = public.get_current_workspace_id() AND deleted_at IS NULL)',
                t, t
            );
        ELSE
            EXECUTE format(
                'CREATE POLICY %I_select ON public.%I
                 FOR SELECT TO authenticated
                 USING (workspace_id = public.get_current_workspace_id())',
                t, t
            );
        END IF;

        EXECUTE format(
            'CREATE POLICY %I_insert ON public.%I
             FOR INSERT TO authenticated
             WITH CHECK (workspace_id = public.get_current_workspace_id())',
            t, t
        );

        EXECUTE format(
            'CREATE POLICY %I_update ON public.%I
             FOR UPDATE TO authenticated
             USING (workspace_id = public.get_current_workspace_id())
             WITH CHECK (workspace_id = public.get_current_workspace_id())',
            t, t
        );

        EXECUTE format(
            'CREATE POLICY %I_delete ON public.%I
             FOR DELETE TO authenticated
             USING (workspace_id = public.get_current_workspace_id())',
            t, t
        );
    END LOOP;
END
$$;

DROP POLICY IF EXISTS m4_workspaces_select ON public.m4_workspaces;
CREATE POLICY m4_workspaces_select
ON public.m4_workspaces
FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT u.workspace_id
        FROM public.m4_users u
        WHERE u.id = auth.uid()
    )
    OR id IN (
        SELECT wu.workspace_id
        FROM public.m4_workspace_users wu
        WHERE wu.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS m4_users_select ON public.m4_users;
CREATE POLICY m4_users_select
ON public.m4_users
FOR SELECT
TO authenticated
USING (workspace_id = public.get_current_workspace_id());

DROP POLICY IF EXISTS m4_users_update ON public.m4_users;
CREATE POLICY m4_users_update
ON public.m4_users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS m4_workspace_users_select ON public.m4_workspace_users;
CREATE POLICY m4_workspace_users_select
ON public.m4_workspace_users
FOR SELECT
TO authenticated
USING (workspace_id = public.get_current_workspace_id());

-- =========================================================
-- 8. TRIGGER
-- =========================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 9. SEEDS ESTRUTURAIS MÍNIMAS
-- =========================================================

INSERT INTO public.m4_workspaces (id, name)
VALUES ('fb786658-1234-4321-8888-999988887777', 'Workspace Principal')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.m4_job_roles (id, workspace_id, name, level, permissions)
VALUES (
  'd167f4e8-4a19-4ab7-b655-f104004f8bf1',
  'fb786658-1234-4321-8888-999988887777',
  'Owner',
  100,
  '{"all": true}'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.m4_pipelines (id, workspace_id, name, position)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'fb786658-1234-4321-8888-999988887777',
  'Vendas',
  0
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.m4_pipeline_stages (pipeline_id, workspace_id, name, position, color, status)
VALUES
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'fb786658-1234-4321-8888-999988887777',
  'Lead',
  0,
  'blue',
  'intermediario'
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'fb786658-1234-4321-8888-999988887777',
  'Fechado',
  1,
  'green',
  'ganho'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.m4_settings (workspace_id, crm_name, company_name, primary_color, theme, language)
VALUES (
  'fb786658-1234-4321-8888-999988887777',
  'M4 CRM',
  'M4 Marketing Digital',
  '#2563eb',
  'light',
  'pt-BR'
)
ON CONFLICT (workspace_id) DO NOTHING;

-- =========================================================
-- 10. GRANTS
-- =========================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, authenticated, service_role;

COMMENT ON SCHEMA public IS 'M4 CRM instalado com sucesso';

COMMIT;