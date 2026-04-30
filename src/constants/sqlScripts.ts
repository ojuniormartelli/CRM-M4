export const CLEAN_RESET_SQL = `-- 🚀 SCRIPT 1: RESET TOTAL E PREPARAÇÃO DO AMBIENTE (M4 CRM)
-- Versão: 2.1 (Resiliente e Completa)
-- Objetivo: Garantir um estado limpo no schema public com permissões corretas para o Supabase.

-- 1. Reset Total do Schema Public
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- 2. Restauração de Extensões Essenciais
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 3. Grants de Base para o Schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;

-- 4. Configurar Privilégios Padrão (Essencial para o Supabase)
-- Isso garante que novas tabelas criadas automaticamente recebam os grants corretos.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO anon;

-- 5. Garantir que o schema public esteja no search_path
ALTER DATABASE postgres SET search_path TO public, extensions;

-- FIM DO SCRIPT 1
`;

export const COMPLETE_INSTALL_SQL = `-- ============================================
-- 1. TIPOS E ENUMS FINANCEIROS
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fin_transaction_type') THEN
        CREATE TYPE fin_transaction_type AS ENUM ('income', 'expense', 'transfer', 'adjustment');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fin_transaction_status') THEN
        CREATE TYPE fin_transaction_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'canceled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fin_category_type') THEN
        CREATE TYPE fin_category_type AS ENUM ('income', 'expense', 'both');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fin_classification_type') THEN
        CREATE TYPE fin_classification_type AS ENUM ('operacional', 'nao_operacional', 'financeiro', 'tributario');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fin_counterparty_type') THEN
        CREATE TYPE fin_counterparty_type AS ENUM ('cliente', 'fornecedor', 'colaborador', 'parceiro', 'outro');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fin_bank_account_type') THEN
        CREATE TYPE fin_bank_account_type AS ENUM ('checking', 'savings', 'cash', 'credit_account', 'investment');
    END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Erro ao gerenciar Enums: %', SQLERRM;
END $$;

-- ============================================
-- 2. FUNÇÕES CORE
-- ============================================

-- Helper: Pegar Workspace ID do usuário logado via m4_users ou m4_workspace_users
CREATE OR REPLACE FUNCTION public.get_current_workspace_id() 
RETURNS UUID AS $$
DECLARE
    v_workspace_id UUID;
BEGIN
    -- 1. Tentar m4_users (perfil principal)
    SELECT workspace_id INTO v_workspace_id FROM public.m4_users WHERE id = auth.uid() LIMIT 1;
    IF v_workspace_id IS NOT NULL THEN
        RETURN v_workspace_id;
    END IF;

    -- 2. Tentar m4_workspace_users (vínculo explícito)
    SELECT workspace_id INTO v_workspace_id FROM public.m4_workspace_users WHERE user_id = auth.uid() LIMIT 1;
    RETURN v_workspace_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Trigger: Sincronização Supabase Auth -> m4_users + Auto-vínculo de Workspace
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  v_default_ws_id UUID := 'fb786658-1234-4321-8888-999988887777';
  v_owner_role_id UUID := 'd167f4e8-4a19-4ab7-b655-f104004f8bf1';
  v_user_count INTEGER;
BEGIN
  -- Garante que o Workspace Principal exista
  INSERT INTO public.m4_workspaces (id, name)
  VALUES (v_default_ws_id, 'Workspace Principal')
  ON CONFLICT (id) DO NOTHING;

  -- Conta usuários para saber se este é o primeiro (Admin/Owner)
  SELECT count(*) INTO v_user_count FROM public.m4_users;

  -- Insere o perfil do usuário
  INSERT INTO public.m4_users (id, name, email, workspace_id, role, job_role_id, status)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    new.email, 
    v_default_ws_id,
    CASE WHEN v_user_count = 0 THEN 'owner' ELSE 'user' END,
    CASE WHEN v_user_count = 0 THEN v_owner_role_id ELSE NULL END,
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    updated_at = now();

  -- Cria vínculo explícito na tabela de relacionamento
  INSERT INTO public.m4_workspace_users (workspace_id, user_id, role)
  VALUES (v_default_ws_id, new.id, CASE WHEN v_user_count = 0 THEN 'owner' ELSE 'member' END)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro no trigger handle_new_user: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. CORE MULTI-TENANT
-- ============================================

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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    username TEXT,
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

-- ============================================
-- 4. CRM
-- ============================================

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
    company_name TEXT,
    company_cnpj TEXT,
    company_city TEXT,
    company_state TEXT,
    company_niche TEXT,
    company_website TEXT,
    company_email TEXT,
    company_instagram TEXT,
    company_linkedin TEXT,
    company_whatsapp TEXT,
    contact_name TEXT,
    contact_role TEXT,
    contact_email TEXT,
    contact_instagram TEXT,
    contact_linkedin TEXT,
    contact_whatsapp TEXT,
    contact_notes TEXT,
    business_notes TEXT,
    service_type TEXT,
    campaign TEXT,
    proposed_ticket DECIMAL(12, 2) DEFAULT 0,
    closing_forecast DATE,
    qualification TEXT,
    ai_score INTEGER DEFAULT 0,
    ai_reasoning TEXT,
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
    list_id UUID,
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
    recurrence TEXT DEFAULT 'none',
    recurrence_pattern JSONB DEFAULT '{}'::jsonb,
    parent_task_id UUID REFERENCES public.m4_tasks(id) ON DELETE CASCADE,
    checklist JSONB DEFAULT '[]'::jsonb,
    dependencies JSONB DEFAULT '[]'::jsonb,
    estimated_hours NUMERIC DEFAULT 0,
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

-- ============================================
-- 5. FINANCEIRO
-- ============================================

CREATE TABLE IF NOT EXISTS public.m4_fin_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type fin_category_type NOT NULL DEFAULT 'both',
    parent_id UUID REFERENCES public.m4_fin_categories(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    classification_type fin_classification_type DEFAULT 'operacional',
    impacts_dre BOOLEAN DEFAULT true,
    dre_group TEXT,
    is_active BOOLEAN DEFAULT true,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_counterparties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type fin_counterparty_type DEFAULT 'outro',
    document TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type fin_bank_account_type DEFAULT 'checking',
    current_balance NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.m4_fin_categories(id),
    bank_account_id UUID REFERENCES public.m4_fin_bank_accounts(id),
    cost_center_id UUID REFERENCES public.m4_fin_cost_centers(id),
    counterparty_id UUID REFERENCES public.m4_fin_counterparties(id),
    client_account_id UUID REFERENCES public.m4_client_accounts(id),
    type fin_transaction_type NOT NULL,
    status fin_transaction_status DEFAULT 'pending',
    amount NUMERIC NOT NULL,
    description TEXT NOT NULL,
    due_date DATE NOT NULL,
    competence_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_frequency TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.m4_fin_categories(id) ON DELETE CASCADE,
    period TEXT NOT NULL, -- YYYY-MM
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 6. AUTOMAÇÕES E METAS
-- ============================================

CREATE TABLE IF NOT EXISTS public.m4_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    trigger_conditions JSONB DEFAULT '{}'::jsonb,
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
    month TEXT NOT NULL, -- YYYY-MM
    target_value DECIMAL(15,2) DEFAULT 0,
    current_value DECIMAL(15,2) DEFAULT 0,
    type TEXT DEFAULT 'sales',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, month, type)
);

-- ============================================
-- 7. CONFIGURAÇÃO DE SEGURANÇA (RLS)
-- ============================================

-- Ativar Sincronização Suprema com Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Habilitar RLS em massa
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'm4_%') LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- Policies de Workspace (Multi-tenant + Soft Delete)
DO $$ 
DECLARE
    t text;
    has_deleted_at boolean;
BEGIN
    FOR t IN (
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' AND tablename LIKE 'm4_%'
        AND tablename NOT IN ('m4_workspaces', 'm4_users', 'm4_workspace_users')
    ) LOOP
        -- Verifica se a tabela tem soft delete
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = t AND column_name = 'deleted_at'
        ) INTO has_deleted_at;

        -- SELECT
        EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I', t, t);
        IF has_deleted_at THEN
            EXECUTE format('CREATE POLICY %I_select ON %I FOR SELECT TO authenticated USING (workspace_id = public.get_current_workspace_id() AND deleted_at IS NULL)', t, t);
        ELSE
            EXECUTE format('CREATE POLICY %I_select ON %I FOR SELECT TO authenticated USING (workspace_id = public.get_current_workspace_id())', t, t);
        END IF;

        -- INSERT
        EXECUTE format('DROP POLICY IF EXISTS %I_insert ON %I', t, t);
        EXECUTE format('CREATE POLICY %I_insert ON %I FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_current_workspace_id())', t, t);
        
        -- UPDATE
        EXECUTE format('DROP POLICY IF EXISTS %I_update ON %I', t, t);
        EXECUTE format('CREATE POLICY %I_update ON %I FOR UPDATE TO authenticated USING (workspace_id = public.get_current_workspace_id()) WITH CHECK (workspace_id = public.get_current_workspace_id())', t, t);
        
        -- DELETE
        EXECUTE format('DROP POLICY IF EXISTS %I_delete ON %I', t, t);
        EXECUTE format('CREATE POLICY %I_delete ON %I FOR DELETE TO authenticated USING (workspace_id = public.get_current_workspace_id())', t, t);

    END LOOP;
END $$;

-- Policies Manuais (Tabelas Core)
DROP POLICY IF EXISTS m4_workspaces_select ON public.m4_workspaces;
CREATE POLICY m4_workspaces_select ON public.m4_workspaces FOR SELECT TO authenticated USING (id IN (SELECT workspace_id FROM public.m4_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS m4_users_select ON public.m4_users;
CREATE POLICY m4_users_select ON public.m4_users FOR SELECT TO authenticated USING (workspace_id = public.get_current_workspace_id());

DROP POLICY IF EXISTS m4_users_update ON public.m4_users;
CREATE POLICY m4_users_update ON public.m4_users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS m4_workspace_users_select ON public.m4_workspace_users;
CREATE POLICY m4_workspace_users_select ON public.m4_workspace_users FOR SELECT TO authenticated USING (workspace_id = public.get_current_workspace_id());

-- ============================================
-- 8. SEEDS RESILIENTES (DADOS ESTRUTURAIS)
-- ============================================

-- Workspace Base
INSERT INTO public.m4_workspaces (id, name)
VALUES ('fb786658-1234-4321-8888-999988887777', 'Workspace Principal')
ON CONFLICT (id) DO NOTHING;

-- Cargo Owner Base
INSERT INTO public.m4_job_roles (id, workspace_id, name, level, permissions)
VALUES ('d167f4e8-4a19-4ab7-b655-f104004f8bf1', 'fb786658-1234-4321-8888-999988887777', 'Owner', 100, '{"all": true}')
ON CONFLICT (id) DO NOTHING;

-- Pipeline e Estágios Base
INSERT INTO public.m4_pipelines (id, workspace_id, name, position)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fb786658-1234-4321-8888-999988887777', 'Funil de Vendas', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.m4_pipeline_stages (id, pipeline_id, workspace_id, name, position, status)
VALUES 
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fb786658-1234-4321-8888-999988887777', 'Novo Lead', 0, 'inicial'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fb786658-1234-4321-8888-999988887777', 'Qualificação', 1, 'intermediario'),
  ('dddddddd-dddd-dddd-dddd-ddddbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fb786658-1234-4321-8888-999988887777', 'Proposta Enviada', 2, 'intermediario'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fb786658-1234-4321-8888-999988887777', 'Fechado (Ganho)', 3, 'ganho')
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. DADOS FINANCEIROS PADRÃO
-- ============================================

-- Categorias de Receita
INSERT INTO public.m4_fin_categories (id, workspace_id, name, type, level, "order", is_active, impacts_dre, dre_group, classification_type)
VALUES
('11111111-1111-1111-1111-111111111102', 'fb786658-1234-4321-8888-999988887777', 'Vendas de Serviços', 'income', 1, 2, true, true, 'Receita Bruta', 'operacional'),
('11111111-1111-1111-1111-111111111103', 'fb786658-1234-4321-8888-999988887777', 'Consultoria e Assessoria', 'income', 1, 3, true, true, 'Receita Bruta', 'operacional'),
('11111111-1111-1111-1111-111111111107', 'fb786658-1234-4321-8888-999988887777', 'Juros Recebidos', 'income', 1, 7, true, true, 'Receita Financeira', 'financeiro'),
('11111111-1111-1111-1111-111111111110', 'fb786658-1234-4321-8888-999988887777', 'Outras Receitas', 'income', 1, 10, true, true, 'Receita Bruta', 'operacional')
ON CONFLICT (id) DO NOTHING;

-- Categorias de Despesa
INSERT INTO public.m4_fin_categories (id, workspace_id, name, type, level, "order", is_active, impacts_dre, dre_group, classification_type)
VALUES
('22222222-2222-2222-2222-222222222201', 'fb786658-1234-4321-8888-999988887777', 'Salários e Encargos', 'expense', 1, 1, true, true, 'Despesa Operacional', 'operacional'),
('22222222-2222-2222-2222-222222222202', 'fb786658-1234-4321-8888-999988887777', 'Aluguel do Escritório', 'expense', 1, 2, true, true, 'Despesa Operacional', 'operacional'),
('22222222-2222-2222-2222-222222222209', 'fb786658-1234-4321-8888-999988887777', 'Publicidade e Marketing', 'expense', 1, 9, true, true, 'Despesa Operacional', 'operacional'),
('22222222-2222-2222-2222-222222222214', 'fb786658-1234-4321-8888-999988887777', 'Despesas Bancárias', 'expense', 1, 14, true, true, 'Despesa Financeira', 'financeiro'),
('22222222-2222-2222-2222-222222222215', 'fb786658-1234-4321-8888-999988887777', 'Outras Despesas', 'expense', 1, 15, true, true, 'Despesa Operacional', 'operacional')
ON CONFLICT (id) DO NOTHING;

-- Centros de Custo
INSERT INTO public.m4_fin_cost_centers (id, workspace_id, name, code, is_active)
VALUES
('33333333-3333-3333-3333-333333333301', 'fb786658-1234-4321-8888-999988887777', 'Administrativo', 'ADM', true),
('33333333-3333-3333-3333-333333333302', 'fb786658-1234-4321-8888-999988887777', 'Comercial / Vendas', 'COM', true),
('33333333-3333-3333-3333-333333333304', 'fb786658-1234-4321-8888-999988887777', 'Operacional', 'OPE', true)
ON CONFLICT (id) DO NOTHING;

-- Formas de Pagamento
INSERT INTO public.m4_fin_payment_methods (id, workspace_id, name, is_active)
VALUES
('44444444-4444-4444-4444-444444444402', 'fb786658-1234-4321-8888-999988887777', 'TED', true),
('44444444-4444-4444-4444-444444444403', 'fb786658-1234-4321-8888-999988887777', 'Pix', true),
('44444444-4444-4444-4444-444444444405', 'fb786658-1234-4321-8888-999988887777', 'Cartão de Crédito', true),
('44444444-4444-4444-4444-444444444407', 'fb786658-1234-4321-8888-999988887777', 'Boleto', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 10. GRANTS FINAIS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, authenticated, service_role;

-- ============================================
-- 11. USUÁRIO ADMINISTRADOR PADRÃO (admin / admin123)
-- ============================================
-- Nota: Criamos o usuário na tabela auth.users do Supabase se ele não existir.
-- O ID é fixo para garantir que o m4_users e o auth.users fiquem em sincronia.

DO $$
DECLARE
    v_admin_id UUID := 'fb786658-1234-4321-8888-000000000000';
    v_ws_id UUID := 'fb786658-1234-4321-8888-999988887777';
BEGIN
    -- 1. Inserir em auth.users (Supabase Auth)
    -- Usamos o ID fixo para o administrador para facilitar referências
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@crm.com') THEN
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, 
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
            is_super_admin, role, aud, confirmation_token
        )
        VALUES (
            v_admin_id,
            '00000000-0000-0000-0000-000000000000',
            'admin@crm.com',
            crypt('admin123', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Administrador M4"}',
            false,
            'authenticated',
            'authenticated',
            ''
        );
        
        -- 2. Garantir que o perfil exista em m4_users (O trigger handle_new_user já deve fazer isso, mas reforçamos)
        INSERT INTO public.m4_users (id, workspace_id, name, email, role, status)
        VALUES (v_admin_id, v_ws_id, 'Administrador M4', 'admin@crm.com', 'owner', 'active')
        ON CONFLICT (id) DO NOTHING;
        
        -- 3. Vínculo com Workspace
        INSERT INTO public.m4_workspace_users (workspace_id, user_id, role)
        VALUES (v_ws_id, v_admin_id, 'owner')
        ON CONFLICT (workspace_id, user_id) DO NOTHING;
    END IF;
END $$;

COMMENT ON SCHEMA public IS 'Instalação M4 CRM Concluída';
`;

export const M4_DEMO_SEED_SQL = `DO $$ 
DECLARE
    v_ws_id UUID := 'fb786658-1234-4321-8888-999988887777';
    v_user_id UUID;
    v_pip_id UUID;
    v_stage_1_id UUID;
    v_stage_2_id UUID;
    v_stage_3_id UUID;
    v_comp_id_1 UUID;
    v_comp_id_2 UUID;
    v_comp_id_3 UUID;
    v_cont_id UUID;
    v_bank_id UUID;
    v_cat_income_id UUID;
    v_cat_expense_id UUID;
BEGIN
    -- 1. Referências básicas
    SELECT id INTO v_user_id 
    FROM m4_users 
    WHERE workspace_id = v_ws_id 
    LIMIT 1;

    -- 2. Conta bancária
    INSERT INTO m4_fin_bank_accounts 
        (workspace_id, name, type, current_balance, is_active)
    VALUES 
        (v_ws_id, 'Conta Principal PJ', 'checking', 25000.00, true)
    RETURNING id INTO v_bank_id;

    IF v_bank_id IS NULL THEN
        SELECT id INTO v_bank_id 
        FROM m4_fin_bank_accounts 
        WHERE workspace_id = v_ws_id 
        LIMIT 1;
    END IF;

    -- 3. Categorias financeiras
    INSERT INTO m4_fin_categories 
        (workspace_id, name, type, impacts_dre)
    VALUES 
        (v_ws_id, 'Receita de Serviços', 'income', true),
        (v_ws_id, 'Despesas Operacionais', 'expense', true);

    SELECT id INTO v_cat_income_id 
    FROM m4_fin_categories 
    WHERE workspace_id = v_ws_id AND type = 'income' 
    LIMIT 1;

    SELECT id INTO v_cat_expense_id 
    FROM m4_fin_categories 
    WHERE workspace_id = v_ws_id AND type = 'expense' 
    LIMIT 1;

    -- 4. Pipeline
    INSERT INTO m4_pipelines (workspace_id, name, position)
    VALUES (v_ws_id, 'Pipeline High-Ticket', 0)
    RETURNING id INTO v_pip_id;

    -- 5. Etapas
    INSERT INTO m4_pipeline_stages 
        (pipeline_id, workspace_id, name, color, position, status)
    VALUES (v_pip_id, v_ws_id, 'Prospecção', 'blue', 0, 'inicial')
    RETURNING id INTO v_stage_1_id;

    INSERT INTO m4_pipeline_stages 
        (pipeline_id, workspace_id, name, color, position, status)
    VALUES (v_pip_id, v_ws_id, 'Qualificação', 'yellow', 1, 'intermediario')
    RETURNING id INTO v_stage_2_id;

    INSERT INTO m4_pipeline_stages 
        (pipeline_id, workspace_id, name, color, position, status)
    VALUES (v_pip_id, v_ws_id, 'Proposta Enviada', 'purple', 2, 'intermediario')
    RETURNING id INTO v_stage_3_id;

    -- 6. Empresas
    INSERT INTO m4_companies 
        (workspace_id, name, city, state, niche, email)
    VALUES 
        (v_ws_id, 'TechFlow Solutions', 'São Paulo', 'SP', 'SaaS', 'contato@techflow.io')
    RETURNING id INTO v_comp_id_1;

    INSERT INTO m4_companies 
        (workspace_id, name, city, state, niche, email)
    VALUES 
        (v_ws_id, 'Moda Fashion Brasil', 'Rio de Janeiro', 'RJ', 'Varejo', 'contato@modafashion.com.br')
    RETURNING id INTO v_comp_id_2;

    INSERT INTO m4_companies 
        (workspace_id, name, city, state, niche, email)
    VALUES 
        (v_ws_id, 'Alimentos Brasil S.A.', 'Curitiba', 'PR', 'Indústria Alimentícia', 'contato@alimentosbrasil.com.br')
    RETURNING id INTO v_comp_id_3;

    -- 7. Contato
    INSERT INTO m4_contacts 
        (workspace_id, company_id, name, email, role, is_primary)
    VALUES 
        (v_ws_id, v_comp_id_1, 'Roberto Silva', 'roberto@techflow.io', 'CEO', true)
    RETURNING id INTO v_cont_id;

    -- 8. Leads (apenas colunas que existem na tabela)
    INSERT INTO m4_leads 
        (workspace_id, pipeline_id, stage_id, company_id, contact_id,
         responsible_id, contact_name, contact_email,
         value, status, temperature, probability, source)
    VALUES 
        (v_ws_id, v_pip_id, v_stage_3_id, v_comp_id_1, v_cont_id,
         v_user_id, 'Roberto Silva', 'roberto@techflow.io',
         15000.00, 'active', 'Quente', 80, 'Indicação'),

        (v_ws_id, v_pip_id, v_stage_2_id, v_comp_id_2, NULL,
         v_user_id, 'Ana Costa', 'ana@modafashion.com.br',
         8000.00, 'active', 'Morno', 50, 'Instagram'),

        (v_ws_id, v_pip_id, v_stage_1_id, v_comp_id_3, NULL,
         v_user_id, 'Carlos Mendes', 'carlos@alimentosbrasil.com.br',
         22000.00, 'active', 'Frio', 20, 'Google'),

        (v_ws_id, v_pip_id, v_stage_3_id, v_comp_id_1, v_cont_id,
         v_user_id, 'Roberto Silva', 'roberto@techflow.io',
         5000.00, 'won', 'Quente', 100, 'Indicação'),

        (v_ws_id, v_pip_id, v_stage_1_id, v_comp_id_2, NULL,
         v_user_id, 'Fernanda Lima', 'fernanda@modafashion.com.br',
         3500.00, 'lost', 'Frio', 0, 'Cold Outreach');

    -- 9. Clientes
    INSERT INTO m4_clients 
        (workspace_id, company_id, company_name, status, 
         monthly_value, manager_id, contract_start_date)
    VALUES 
        (v_ws_id, v_comp_id_1, 'TechFlow Solutions', 'active', 
         5250.00, v_user_id, CURRENT_DATE - INTERVAL '3 months'),

        (v_ws_id, v_comp_id_2, 'Moda Fashion Brasil', 'active', 
         3800.00, v_user_id, CURRENT_DATE - INTERVAL '1 month');

    -- 10. Tarefas
    INSERT INTO m4_tasks 
        (workspace_id, company_id, title, status, priority, 
         task_type, assigned_to, due_date)
    VALUES 
        (v_ws_id, v_comp_id_1, 'Enviar proposta TechFlow', 
         'Pendente', 'Alta', 'operational', 
         v_user_id, CURRENT_TIMESTAMP + INTERVAL '2 days'),

        (v_ws_id, v_comp_id_2, 'Reunião Moda Fashion', 
         'Em Execução', 'Média', 'operational', 
         v_user_id, CURRENT_TIMESTAMP + INTERVAL '1 day'),

        (v_ws_id, v_comp_id_3, 'Follow-up Alimentos Brasil', 
         'Pendente', 'Baixa', 'operational', 
         v_user_id, CURRENT_TIMESTAMP + INTERVAL '5 days');

    -- 11. Transações financeiras
    INSERT INTO m4_fin_transactions 
        (workspace_id, bank_account_id, category_id, type, status,
         description, amount, due_date, competence_date, paid_at)
    VALUES 
        (v_ws_id, v_bank_id, v_cat_income_id, 'income', 'paid',
         'Mensalidade TechFlow', 5250.00, 
         CURRENT_DATE, CURRENT_DATE, now()),

        (v_ws_id, v_bank_id, v_cat_income_id, 'income', 'paid',
         'Mensalidade Moda Fashion', 3800.00, 
         CURRENT_DATE - INTERVAL '5 days', 
         CURRENT_DATE - INTERVAL '5 days', 
         now() - INTERVAL '5 days'),

        (v_ws_id, v_bank_id, v_cat_income_id, 'income', 'pending',
         'Projeto CRM TechFlow', 8000.00, 
         CURRENT_DATE + INTERVAL '15 days', 
         CURRENT_DATE + INTERVAL '15 days', NULL),

        (v_ws_id, v_bank_id, v_cat_expense_id, 'expense', 'paid',
         'Servidores AWS', 850.20, 
         CURRENT_DATE - INTERVAL '10 days', 
         CURRENT_DATE - INTERVAL '10 days', 
         now() - INTERVAL '10 days'),

        (v_ws_id, v_bank_id, v_cat_expense_id, 'expense', 'paid',
         'Salários Equipe', 8500.00, 
         CURRENT_DATE - INTERVAL '3 days', 
         CURRENT_DATE - INTERVAL '3 days', 
         now() - INTERVAL '3 days'),

        (v_ws_id, v_bank_id, v_cat_expense_id, 'expense', 'pending',
         'Aluguel Escritório', 4200.00, 
         CURRENT_DATE + INTERVAL '10 days', 
         CURRENT_DATE + INTERVAL '10 days', NULL);

    -- 12. Meta do mês
    INSERT INTO m4_goals 
        (workspace_id, month, target_value, current_value, type)
    VALUES 
        (v_ws_id, TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 30000.00, 9050.00, 'sales')
    ON CONFLICT (workspace_id, month, type) DO NOTHING;

    RAISE NOTICE '✅ Seed concluído com sucesso!';
END $$;
`;

export const SEED_SQL = M4_DEMO_SEED_SQL;


export const FULL_SETUP_SQL = `
-- 🚀 SCRIPT DE INSTALACAO SEGURA (M4 CRM & Agency Suite)
-- Este script cria a estrutura necessária sem apagar dados existentes.

-- 1. ENUMS FINANCEIROS (Cria apenas se não existirem)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fin_transaction_type') THEN
        CREATE TYPE fin_transaction_type AS ENUM ('income', 'expense', 'transfer', 'adjustment');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fin_transaction_status') THEN
        CREATE TYPE fin_transaction_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'canceled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fin_category_type') THEN
        CREATE TYPE fin_category_type AS ENUM ('income', 'expense', 'both');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fin_classification_type') THEN
        CREATE TYPE fin_classification_type AS ENUM ('operacional', 'nao_operacional', 'financeiro', 'tributario');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fin_counterparty_type') THEN
        CREATE TYPE fin_counterparty_type AS ENUM ('cliente', 'fornecedor', 'colaborador', 'parceiro', 'outro');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fin_bank_account_type') THEN
        CREATE TYPE fin_bank_account_type AS ENUM ('checking', 'savings', 'cash', 'credit_account', 'investment');
    END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Erro ao gerenciar Enums: %', SQLERRM;
END $$;

-- 2. NÚCLEO TENANT (Workspaces & Usuários)
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    logo_url TEXT,
    primary_color TEXT DEFAULT '#2563eb',
    theme TEXT DEFAULT 'light',
    language TEXT DEFAULT 'pt-BR',
    city TEXT,
    state TEXT,
    website TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CRM E OPERAÇÕES
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

CREATE TABLE IF NOT EXISTS public.m4_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    pipeline_id UUID REFERENCES public.m4_pipelines(id) ON DELETE SET NULL,
    stage_id UUID REFERENCES public.m4_pipeline_stages(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.m4_companies(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.m4_contacts(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active',
    company_name TEXT,
    company_cnpj TEXT,
    company_city TEXT,
    company_state TEXT,
    company_niche TEXT,
    company_website TEXT,
    company_email TEXT,
    company_instagram TEXT,
    company_linkedin TEXT,
    company_whatsapp TEXT,
    contact_name TEXT,
    contact_role TEXT,
    contact_email TEXT,
    contact_instagram TEXT,
    contact_linkedin TEXT,
    contact_whatsapp TEXT,
    contact_notes TEXT,
    value DECIMAL(12, 2) DEFAULT 0,
    business_notes TEXT,
    service_type TEXT,
    proposed_ticket DECIMAL(12, 2) DEFAULT 0,
    temperature TEXT DEFAULT 'Frio',
    probability INTEGER DEFAULT 0,
    source TEXT,
    campaign TEXT,
    closing_forecast DATE,
    next_action TEXT,
    next_action_date DATE,
    qualification TEXT,
    ai_score INTEGER DEFAULT 0,
    ai_reasoning TEXT,
    responsible_id UUID,
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    custom_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_m4_leads_company_cnpj ON public.m4_leads(company_cnpj);
CREATE INDEX IF NOT EXISTS idx_m4_leads_company_email ON public.m4_leads(company_email);
CREATE INDEX IF NOT EXISTS idx_m4_leads_contact_email ON public.m4_leads(contact_email);
CREATE INDEX IF NOT EXISTS idx_m4_leads_workspace_id ON public.m4_leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_m4_leads_pipeline_id ON public.m4_leads(pipeline_id);

CREATE TABLE IF NOT EXISTS public.m4_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.m4_leads(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.m4_companies(id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    manager_id UUID,
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
    lead_id UUID REFERENCES public.m4_leads(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.m4_clients(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.m4_companies(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Pendente',
    priority TEXT DEFAULT 'Média',
    due_date TIMESTAMPTZ,
    assigned_to UUID,
    type TEXT DEFAULT 'task',
    is_recurring BOOLEAN DEFAULT false,
    checklist JSONB DEFAULT '[]'::jsonb,
    actual_hours DECIMAL(10, 2) DEFAULT 0,
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
    sender_name TEXT,
    sender_email TEXT,
    recipient_email TEXT,
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
    open_rate TEXT DEFAULT '-',
    click_rate TEXT DEFAULT '-',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    user_name TEXT,
    user_role TEXT,
    content TEXT,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    type TEXT DEFAULT 'update',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. FINANCEIRO NOVO (m4_fin_*)
CREATE TABLE IF NOT EXISTS public.m4_fin_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type fin_category_type NOT NULL DEFAULT 'both',
    parent_id UUID REFERENCES public.m4_fin_categories(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    "order" INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    impacts_dre BOOLEAN DEFAULT true,
    dre_group TEXT,
    classification_type fin_classification_type DEFAULT 'operacional',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_counterparties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type fin_counterparty_type DEFAULT 'outro',
    document TEXT,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bank TEXT,
    type fin_bank_account_type DEFAULT 'checking',
    initial_balance NUMERIC DEFAULT 0,
    initial_balance_date DATE DEFAULT CURRENT_DATE,
    color TEXT,
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    currency TEXT DEFAULT 'BRL',
    balance NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    type fin_transaction_type NOT NULL,
    status fin_transaction_status DEFAULT 'pending',
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    competence_date DATE NOT NULL,
    bank_account_id UUID REFERENCES public.m4_fin_bank_accounts(id) ON DELETE SET NULL,
    destination_bank_account_id UUID REFERENCES public.m4_fin_bank_accounts(id) ON DELETE SET NULL,
    counterparty_id UUID REFERENCES public.m4_fin_counterparties(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.m4_fin_categories(id) ON DELETE SET NULL,
    cost_center_id UUID REFERENCES public.m4_fin_cost_centers(id) ON DELETE SET NULL,
    payment_method TEXT,
    reference_code TEXT,
    notes TEXT,
    attachment_url TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_group_id UUID,
    recurrence_frequency TEXT,
    recurrence_interval INTEGER DEFAULT 1,
    recurrence_end_date DATE,
    parent_transaction_id UUID REFERENCES public.m4_fin_transactions(id) ON DELETE SET NULL,
    generation_mode TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.m4_fin_categories(id) ON DELETE CASCADE,
    cost_center_id UUID REFERENCES public.m4_fin_cost_centers(id) ON DELETE CASCADE,
    period TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    scenario TEXT NOT NULL DEFAULT 'realistic',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    trigger_conditions JSONB DEFAULT '{}'::jsonb,
    actions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    automation_id UUID REFERENCES public.m4_automations(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL,
    entity_type TEXT NOT NULL,
    action_type TEXT NOT NULL,
    status TEXT DEFAULT 'success',
    error_message TEXT,
    execution_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. METAS E OBJETIVOS
CREATE TABLE IF NOT EXISTS public.m4_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- Formato YYYY-MM
    target_value DECIMAL(15,2) DEFAULT 0,
    current_value DECIMAL(15,2) DEFAULT 0,
    type TEXT DEFAULT 'sales',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, month, type)
);

-- 7. SEEDS INICIAIS
INSERT INTO public.m4_workspaces (id, name)
VALUES ('fb786658-1234-4321-8888-999988887777', 'Workspace Principal')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.m4_job_roles (id, workspace_id, name, level, permissions)
VALUES ('d167f4e8-4a19-4ab7-b655-f104004f8bf1', 'fb786658-1234-4321-8888-999988887777', 'Owner', 100, '{"all": true}')
ON CONFLICT (id) DO NOTHING;

-- Admin Padrão
INSERT INTO public.m4_users (id, name, email, role, job_role_id, workspace_id, status, must_change_password)
VALUES ('d167f4e8-4a19-4ab7-b655-f104004f8bf0', 'Administrador', 'admin@crm.com', 'owner', 'd167f4e8-4a19-4ab7-b655-f104004f8bf1', 'fb786658-1234-4321-8888-999988887777', 'active', true)
ON CONFLICT (id) DO NOTHING;

-- Pipelines e Stages
INSERT INTO public.m4_pipelines (id, workspace_id, name, position)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fb786658-1234-4321-8888-999988887777', 'Vendas Comercial', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.m4_pipeline_stages (id, pipeline_id, workspace_id, name, position, status)
VALUES 
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fb786658-1234-4321-8888-999988887777', 'Lead', 0, 'inicial'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fb786658-1234-4321-8888-999988887777', 'Qualificação', 1, 'intermediario'),
  ('dddddddd-dddd-dddd-dddd-ddddbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fb786658-1234-4321-8888-999988887777', 'Proposta', 2, 'intermediario'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fb786658-1234-4321-8888-999988887777', 'Fechamento', 3, 'ganho')
ON CONFLICT (id) DO NOTHING;

-- 7. PERMISSÕES E RLS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Ativar RLS e Substituir Políticas Inseguras
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'm4_%') LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all access" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Workspace Access" ON %I', t);
    END LOOP;
END $$;

-- 1. Helper: Pegar Workspace ID do usuário logado
CREATE OR REPLACE FUNCTION public.get_current_workspace_id() 
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT workspace_id FROM public.m4_users WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Políticas de Isolamento por Workspace e Soft Delete
DO $$ 
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
        -- Verificar se a tabela tem a coluna deleted_at
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = t AND column_name = 'deleted_at'
        ) INTO has_deleted_at;

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
END $$;

-- 3. Políticas Especiais para Tabelas de Core
-- m4_workspaces: Usuários podem ver o workspace em que participam
DROP POLICY IF EXISTS "Workspace Member Visibility" ON public.m4_workspaces;
CREATE POLICY "Workspace Member Visibility" ON public.m4_workspaces
FOR SELECT TO authenticated
USING (id IN (SELECT workspace_id FROM public.m4_users WHERE id = auth.uid()));

-- m4_users: Usuários podem ver a si mesmos e colegas do mesmo workspace
DROP POLICY IF EXISTS "User Profile Visibility" ON public.m4_users;
CREATE POLICY "User Profile Visibility" ON public.m4_users
FOR SELECT TO authenticated
USING (workspace_id = public.get_current_workspace_id());

DROP POLICY IF EXISTS "User Self Update" ON public.m4_users;
CREATE POLICY "User Self Update" ON public.m4_users
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 4. Trigger de Sincronização Supabase Auth -> Perfil m4_users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.m4_users (id, name, email, workspace_id, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    new.email, 
    'fb786658-1234-4321-8888-999988887777', -- Default Admin Workspace
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Garantir Permissões
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.m4_users TO anon; -- Necessário para login inicial em cenários híbridos

-- 1. CATEGORIAS DE PLANO DE CONTAS (RECEITAS)
-- ============================================
INSERT INTO public.m4_fin_categories (id, workspace_id, name, type, level, "order", is_active, impacts_dre, dre_group, classification_type, created_at, updated_at)
VALUES
('11111111-1111-1111-1111-111111111101', 'fb786658-1234-4321-8888-999988887777', 'Vendas de Produtos', 'income', 1, 1, true, true, 'Receita Bruta', 'operacional', NOW(), NOW()),
('11111111-1111-1111-1111-111111111102', 'fb786658-1234-4321-8888-999988887777', 'Vendas de Serviços', 'income', 1, 2, true, true, 'Receita Bruta', 'operacional', NOW(), NOW()),
('11111111-1111-1111-1111-111111111103', 'fb786658-1234-4321-8888-999988887777', 'Consultoria e Assessoria', 'income', 1, 3, true, true, 'Receita Bruta', 'operacional', NOW(), NOW()),
('11111111-1111-1111-1111-111111111104', 'fb786658-1234-4321-8888-999988887777', 'Treinamentos', 'income', 1, 4, true, true, 'Receita Bruta', 'operacional', NOW(), NOW()),
('11111111-1111-1111-1111-111111111105', 'fb786658-1234-4321-8888-999988887777', 'Licenças de Software', 'income', 1, 5, true, true, 'Receita Bruta', 'operacional', NOW(), NOW()),
('11111111-1111-1111-1111-111111111106', 'fb786658-1234-4321-8888-999988887777', 'Comissões Recebidas', 'income', 1, 6, true, true, 'Receita Bruta', 'operacional', NOW(), NOW()),
('11111111-1111-1111-1111-111111111107', 'fb786658-1234-4321-8888-999988887777', 'Juros Recebidos', 'income', 1, 7, true, true, 'Receita Financeira', 'financeiro', NOW(), NOW()),
('11111111-1111-1111-1111-111111111108', 'fb786658-1234-4321-8888-999988887777', 'Aluguel de Espaço', 'income', 1, 8, true, true, 'Receita Bruta', 'operacional', NOW(), NOW()),
('11111111-1111-1111-1111-111111111109', 'fb786658-1234-4321-8888-999988887777', 'Royalties', 'income', 1, 9, true, true, 'Receita Bruta', 'operacional', NOW(), NOW()),
('11111111-1111-1111-1111-111111111110', 'fb786658-1234-4321-8888-999988887777', 'Outras Receitas', 'income', 1, 10, true, true, 'Receita Bruta', 'operacional', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
-- ============================================
-- 2. CATEGORIAS DE PLANO DE CONTAS (DESPESAS)
-- ============================================
INSERT INTO public.m4_fin_categories (id, workspace_id, name, type, level, "order", is_active, impacts_dre, dre_group, classification_type, created_at, updated_at)
VALUES
('22222222-2222-2222-2222-222222222201', 'fb786658-1234-4321-8888-999988887777', 'Salários e Encargos', 'expense', 1, 1, true, true, 'Despesa Operacional', 'operacional', NOW(), NOW()),
('22222222-2222-2222-2222-222222222202', 'fb786658-1234-4321-8888-999988887777', 'Aluguel do Escritório', 'expense', 1, 2, true, true, 'Despesa Operacional', 'operacional', NOW(), NOW()),
('22222222-2222-2222-2222-222222222203', 'fb786658-1234-4321-8888-999988887777', 'Energia Elétrica', 'expense', 1, 3, true, true, 'Despesa Operacional', 'operacional', NOW(), NOW()),
('22222222-2222-2222-2222-222222222204', 'fb786658-1234-4321-8888-999988887777', 'Água e Saneamento', 'expense', 1, 4, true, true, 'Despesa Operacional', 'operacional', NOW(), NOW()),
('22222222-2222-2222-2222-222222222205', 'fb786658-1234-4321-8888-999988887777', 'Internet e Telefone', 'expense', 1, 5, true, true, 'Despesa Operacional', 'operacional', NOW(), NOW()),
('22222222-2222-2222-2222-222222222206', 'fb786658-1234-4321-8888-999988887777', 'Combustível e Transporte', 'expense', 1, 6, true, true, 'Despesa Operacional', 'operacional', NOW(), NOW()),
('22222222-2222-2222-2222-222222222207', 'fb786658-1234-4321-8888-999988887777', 'Manutenção de Equipamentos', 'expense', 1, 7, true, true, 'Despesa Operacional', 'operacional', NOW(), NOW()),
('22222222-2222-2222-2222-222222222208', 'fb786658-1234-4321-8888-999988887777', 'Software e Licenças', 'expense', 1, 8, true, true, 'Despesa Operacional', 'operacional', NOW(), NOW()),
('22222222-2222-2222-2222-222222222209', 'fb786658-1234-4321-8888-999988887777', 'Publicidade e Marketing', 'expense', 1, 9, true, true, 'Despesa Operacional', 'operacional', NOW(), NOW()),
('22222222-2222-2222-2222-222222222210', 'fb786658-1234-4321-8888-999988887777', 'Viagens e Hospedagem', 'expense', 1, 10, true, true, 'Despesa Operacional', 'operacional', NOW(), NOW()),
('22222222-2222-2222-2222-222222222211', 'fb786658-1234-4321-8888-999988887777', 'Materiais de Escritório', 'expense', 1, 11, true, true, 'Despesa Operacional', 'operacional', NOW(), NOW()),
('22222222-2222-2222-2222-222222222212', 'fb786658-1234-4321-8888-999988887777', 'Seguros', 'expense', 1, 12, true, true, 'Despesa Operacional', 'operacional', NOW(), NOW()),
('22222222-2222-2222-2222-222222222213', 'fb786658-1234-4321-8888-999988887777', 'Impostos e Taxas', 'expense', 1, 13, true, true, 'Despesa Tributária', 'tributario', NOW(), NOW()),
('22222222-2222-2222-2222-222222222214', 'fb786658-1234-4321-8888-999988887777', 'Despesas Bancárias', 'expense', 1, 14, true, true, 'Despesa Financeira', 'financeiro', NOW(), NOW()),
('22222222-2222-2222-2222-222222222215', 'fb786658-1234-4321-8888-999988887777', 'Outras Despesas', 'expense', 1, 15, true, true, 'Despesa Operacional', 'operacional', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
-- ============================================
-- 3. CENTROS DE CUSTOS
-- ============================================
INSERT INTO public.m4_fin_cost_centers (id, workspace_id, name, code, description, is_active, "order", created_at, updated_at)
VALUES
('33333333-3333-3333-3333-333333333301', 'fb786658-1234-4321-8888-999988887777', 'Administrativo', 'ADM', 'Departamento Administrativo', true, 1, NOW(), NOW()),
('33333333-3333-3333-3333-333333333302', 'fb786658-1234-4321-8888-999988887777', 'Comercial / Vendas', 'COM', 'Departamento de Vendas', true, 2, NOW(), NOW()),
('33333333-3333-3333-3333-333333333303', 'fb786658-1234-4321-8888-999988887777', 'Marketing', 'MKT', 'Departamento de Marketing', true, 3, NOW(), NOW()),
('33333333-3333-3333-3333-333333333304', 'fb786658-1234-4321-8888-999988887777', 'Operacional', 'OPE', 'Departamento Operacional', true, 4, NOW(), NOW()),
('33333333-3333-3333-3333-333333333305', 'fb786658-1234-4321-8888-999988887777', 'Financeiro', 'FIN', 'Departamento Financeiro', true, 5, NOW(), NOW()),
('33333333-3333-3333-3333-333333333306', 'fb786658-1234-4321-8888-999988887777', 'Recursos Humanos', 'RH', 'Departamento de Recursos Humanos', true, 6, NOW(), NOW()),
('33333333-3333-3333-3333-333333333307', 'fb786658-1234-4321-8888-999988887777', 'Tecnologia / TI', 'TI', 'Departamento de Tecnologia', true, 7, NOW(), NOW()),
('33333333-3333-3333-3333-333333333308', 'fb786658-1234-4321-8888-999988887777', 'Projetos', 'PRJ', 'Departamento de Projetos', true, 8, NOW(), NOW()),
('33333333-3333-3333-3333-333333333309', 'fb786658-1234-4321-8888-999988887777', 'Suporte ao Cliente', 'SUP', 'Departamento de Suporte', true, 9, NOW(), NOW()),
('33333333-3333-3333-3333-333333333310', 'fb786658-1234-4321-8888-999988887777', 'Pesquisa e Desenvolvimento', 'P&D', 'Departamento de P&D', true, 10, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
-- ============================================
-- 4. FORMAS DE PAGAMENTO
-- ============================================
INSERT INTO public.m4_fin_payment_methods (id, workspace_id, name, is_active, created_at, updated_at)
VALUES
('44444444-4444-4444-4444-444444444401', 'fb786658-1234-4321-8888-999988887777', 'Dinheiro', true, NOW(), NOW()),
('44444444-4444-4444-4444-444444444402', 'fb786658-1234-4321-8888-999988887777', 'Transferência Bancária (TED)', true, NOW(), NOW()),
('44444444-4444-4444-4444-444444444403', 'fb786658-1234-4321-8888-999988887777', 'Pix', true, NOW(), NOW()),
('44444444-4444-4444-4444-444444444404', 'fb786658-1234-4321-8888-999988887777', 'Cheque', true, NOW(), NOW()),
('44444444-4444-4444-4444-444444444405', 'fb786658-1234-4321-8888-999988887777', 'Cartão de Crédito', true, NOW(), NOW()),
('44444444-4444-4444-4444-444444444406', 'fb786658-1234-4321-8888-999988887777', 'Cartão de Débito', true, NOW(), NOW()),
('44444444-4444-4444-4444-444444444407', 'fb786658-1234-4321-8888-999988887777', 'Boleto Bancário', true, NOW(), NOW()),
('44444444-4444-4444-4444-444444444408', 'fb786658-1234-4321-8888-999988887777', 'Depósito em Conta', true, NOW(), NOW()),
('44444444-4444-4444-4444-444444444409', 'fb786658-1234-4321-8888-999988887777', 'Crediário', true, NOW(), NOW()),
('44444444-4444-4444-4444-444444444410', 'fb786658-1234-4321-8888-999988887777', 'Outros', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`;

export const UPDATE_SQL = `-- 🚀 SCRIPT DE ATUALIZACAO SEGURA (Nucleo Multi-Tenant)
-- Use este script para migrar um banco legado para o novo padrao sem perda de dados primarios.

DO $$ 
BEGIN
    -- 1. Garante Tabelas de Workspace
    CREATE TABLE IF NOT EXISTS public.m4_workspaces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        branding_config JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    IF NOT EXISTS (SELECT 1 FROM public.m4_workspaces WHERE id = 'fb786658-1234-4321-8888-999988887777') THEN
        INSERT INTO public.m4_workspaces (id, name) VALUES ('fb786658-1234-4321-8888-999988887777', 'Workspace Principal');
    END IF;

    -- 2. Atualiza tabelas existentes com workspace_id
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.m4_workspaces(id) DEFAULT 'fb786658-1234-4321-8888-999988887777';
    ALTER TABLE m4_companies ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.m4_workspaces(id) DEFAULT 'fb786658-1234-4321-8888-999988887777';
    ALTER TABLE m4_contacts ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.m4_workspaces(id) DEFAULT 'fb786658-1234-4321-8888-999988887777';
    ALTER TABLE m4_tasks ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.m4_workspaces(id) DEFAULT 'fb786658-1234-4321-8888-999988887777';
    ALTER TABLE m4_tasks ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.m4_companies(id) ON DELETE SET NULL;
    ALTER TABLE m4_settings ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.m4_workspaces(id) DEFAULT 'fb786658-1234-4321-8888-999988887777';
    ALTER TABLE m4_settings ADD COLUMN IF NOT EXISTS cnpj TEXT;
    ALTER TABLE m4_settings ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE m4_settings ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE m4_settings ADD COLUMN IF NOT EXISTS website TEXT;
    ALTER TABLE m4_settings ADD COLUMN IF NOT EXISTS zip_code TEXT;
    ALTER TABLE m4_settings ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE m4_settings ADD COLUMN IF NOT EXISTS address_number TEXT;
    ALTER TABLE m4_settings ADD COLUMN IF NOT EXISTS complement TEXT;
    ALTER TABLE m4_settings ADD COLUMN IF NOT EXISTS neighborhood TEXT;
    ALTER TABLE m4_settings ADD COLUMN IF NOT EXISTS city TEXT;
    ALTER TABLE m4_settings ADD COLUMN IF NOT EXISTS state TEXT;
    ALTER TABLE m4_users ADD COLUMN IF NOT EXISTS username TEXT;
    ALTER TABLE m4_users ADD COLUMN IF NOT EXISTS job_role_id UUID REFERENCES public.m4_job_roles(id) ON DELETE SET NULL;
    ALTER TABLE m4_fin_categories ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
    ALTER TABLE m4_fin_categories ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

    -- 3. Soft Delete Columns (Definitive Migration)
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE m4_companies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE m4_contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE m4_tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE m4_clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE m4_projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

    -- 3.1 Índices para Soft Delete
    CREATE INDEX IF NOT EXISTS idx_m4_leads_deleted_at ON m4_leads(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_m4_companies_deleted_at ON m4_companies(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_m4_contacts_deleted_at ON m4_contacts(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_m4_tasks_deleted_at ON m4_tasks(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_m4_clients_deleted_at ON m4_clients(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_m4_projects_deleted_at ON m4_projects(deleted_at);

    -- 4. Correção Schema Leads (Colunas Ausentes)
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS company_name TEXT;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS company_cnpj TEXT;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS company_city TEXT;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS company_state TEXT;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS company_niche TEXT;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS company_website TEXT;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS company_email TEXT;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS company_instagram TEXT;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS company_linkedin TEXT;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS company_whatsapp TEXT;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS contact_role TEXT;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS contact_email TEXT;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS contact_instagram TEXT;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS contact_linkedin TEXT;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS contact_notes TEXT;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS business_notes TEXT;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS service_type TEXT;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS campaign TEXT;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS proposed_ticket DECIMAL(12, 2) DEFAULT 0;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS closing_forecast DATE;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS qualification TEXT;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS ai_score INTEGER DEFAULT 0;
    ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;

    -- 5. Índices de Performance
    CREATE INDEX IF NOT EXISTS idx_m4_leads_company_cnpj ON public.m4_leads(company_cnpj);
    CREATE INDEX IF NOT EXISTS idx_m4_leads_company_email ON public.m4_leads(company_email);
    CREATE INDEX IF NOT EXISTS idx_m4_leads_contact_email ON public.m4_leads(contact_email);

    -- 6. Atualização de Políticas RLS (Soft Delete - Estático para Máxima Segurança)
    DROP POLICY IF EXISTS "Workspace Access" ON m4_leads;
    CREATE POLICY "Workspace Access" ON m4_leads FOR ALL TO authenticated USING (workspace_id = public.get_current_workspace_id() AND deleted_at IS NULL) WITH CHECK (workspace_id = public.get_current_workspace_id());
    
    DROP POLICY IF EXISTS "Workspace Access" ON m4_companies;
    CREATE POLICY "Workspace Access" ON m4_companies FOR ALL TO authenticated USING (workspace_id = public.get_current_workspace_id() AND deleted_at IS NULL) WITH CHECK (workspace_id = public.get_current_workspace_id());

    DROP POLICY IF EXISTS "Workspace Access" ON m4_contacts;
    CREATE POLICY "Workspace Access" ON m4_contacts FOR ALL TO authenticated USING (workspace_id = public.get_current_workspace_id() AND deleted_at IS NULL) WITH CHECK (workspace_id = public.get_current_workspace_id());

    DROP POLICY IF EXISTS "Workspace Access" ON m4_tasks;
    CREATE POLICY "Workspace Access" ON m4_tasks FOR ALL TO authenticated USING (workspace_id = public.get_current_workspace_id() AND deleted_at IS NULL) WITH CHECK (workspace_id = public.get_current_workspace_id());

    DROP POLICY IF EXISTS "Workspace Access" ON m4_clients;
    CREATE POLICY "Workspace Access" ON m4_clients FOR ALL TO authenticated USING (workspace_id = public.get_current_workspace_id() AND deleted_at IS NULL) WITH CHECK (workspace_id = public.get_current_workspace_id());

    DROP POLICY IF EXISTS "Workspace Access" ON m4_projects;
    CREATE POLICY "Workspace Access" ON m4_projects FOR ALL TO authenticated USING (workspace_id = public.get_current_workspace_id() AND deleted_at IS NULL) WITH CHECK (workspace_id = public.get_current_workspace_id());
END $$;
`;

export const MIGRATION_SQL = `-- 🚀 MIGRACAO DE DADOS: LEGADO -> M4_FIN
-- Este script move seus dados financeiros das tabelas m4_transactions para m4_fin_transactions.

DO $$
DECLARE
    v_workspace_id UUID := 'fb786658-1234-4321-8888-999988887777';
BEGIN
    -- 1. Transfere Transações se a tabela legada existir
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'm4_transactions') THEN
        INSERT INTO public.m4_fin_transactions (
            description, amount, type, status, due_date, competence_date, workspace_id, created_at
        )
        SELECT 
            description, amount, 
            lower(type)::fin_transaction_type, 
            'paid'::fin_transaction_status,
            COALESCE(date, now()::date),
            COALESCE(date, now()::date),
            v_workspace_id,
            created_at
        FROM public.m4_transactions
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
`;
