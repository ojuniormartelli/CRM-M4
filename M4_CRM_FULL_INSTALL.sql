-- 🚀 SCRIPT DE INSTALAÇÃO COMPLETA (M4 CRM & Agency Suite - PRODUÇÃO)
-- Este script reconstrói todo o sistema de CRM, Financeiro, Automações e Metas.
-- Requisito: Executar o Script 1 (RESET) antes deste.

-- ============================================
-- 1. TIPOS E ENUMS (fin_*)
-- ============================================
CREATE TYPE fin_transaction_type AS ENUM ('income', 'expense', 'transfer', 'adjustment');
CREATE TYPE fin_transaction_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'canceled');
CREATE TYPE fin_category_type AS ENUM ('income', 'expense', 'both');
CREATE TYPE fin_classification_type AS ENUM ('operacional', 'nao_operacional', 'financeiro', 'tributario');
CREATE TYPE fin_counterparty_type AS ENUM ('cliente', 'fornecedor', 'colaborador', 'parceiro', 'outro');
CREATE TYPE fin_bank_account_type AS ENUM ('checking', 'savings', 'cash', 'credit_account', 'investment');

-- ============================================
-- 2. FUNÇÕES DO NÚCLEO (get_current_workspace_id, handle_new_user)
-- ============================================

-- Helper: Pegar Workspace ID do usuário logado
CREATE OR REPLACE FUNCTION public.get_current_workspace_id() 
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT workspace_id FROM public.m4_users WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Trigger: Sincronização Supabase Auth -> m4_users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.m4_users (id, name, email, workspace_id, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    new.email, 
    'fb786658-1234-4321-8888-999988887777', -- Workspace Principal Padrão
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. CORE MULTI-TENANT (Workspaces, Roles, Users)
-- ============================================
CREATE TABLE public.m4_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    branding_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_job_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level INTEGER DEFAULT 10,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_users (
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

CREATE TABLE public.m4_workspace_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.m4_users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, user_id)
);

CREATE TABLE public.m4_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE UNIQUE,
    crm_name TEXT DEFAULT 'M4 CRM',
    company_name TEXT DEFAULT 'Agency Cloud',
    logo_url TEXT,
    primary_color TEXT DEFAULT '#2563eb',
    theme TEXT DEFAULT 'light',
    language TEXT DEFAULT 'pt-BR',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. CRM (Pipelines, Empresas, Contatos, Leads)
-- ============================================
CREATE TABLE public.m4_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES public.m4_pipelines(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT 'blue',
    position INTEGER DEFAULT 0,
    status TEXT DEFAULT 'intermediario',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_companies (
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

CREATE TABLE public.m4_contacts (
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

CREATE TABLE public.m4_leads (
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

CREATE TABLE public.m4_projects (
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

CREATE TABLE public.m4_clients (
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

CREATE TABLE public.m4_client_accounts (
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

CREATE TABLE public.m4_tasks (
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

CREATE TABLE public.m4_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    default_price DECIMAL(12, 2) DEFAULT 0,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_emails (
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

CREATE TABLE public.m4_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT,
    status TEXT DEFAULT 'Agendada',
    sent_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    user_name TEXT,
    content TEXT,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. FINANCEIRO (Categorias, Bancos, Transações)
-- ============================================
CREATE TABLE public.m4_fin_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type fin_category_type NOT NULL DEFAULT 'both',
    parent_id UUID REFERENCES public.m4_fin_categories(id) ON DELETE CASCADE,
    classification_type fin_classification_type DEFAULT 'operacional',
    impacts_dre BOOLEAN DEFAULT true,
    dre_group TEXT,
    is_active BOOLEAN DEFAULT true,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_fin_cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_fin_counterparties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type fin_counterparty_type DEFAULT 'outro',
    document TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_fin_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_fin_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type fin_bank_account_type DEFAULT 'checking',
    current_balance NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_fin_transactions (
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
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_fin_budgets (
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
CREATE TABLE public.m4_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    trigger_conditions JSONB DEFAULT '{}'::jsonb,
    actions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    automation_id UUID REFERENCES public.m4_automations(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_goals (
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
-- 7. CONFIGURAÇÃO DE RLS (SEGURANÇA EXTREMA)
-- ============================================

-- Ativar Sincronização automática com Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Habilitar RLS em todas as tabelas m4_%
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'm4_%') LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- Aplicação em Lote de Políticas de Workspace + Soft Delete
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
        -- Ignorar tabelas core que precisam de políticas manuais
        AND tablename NOT IN ('m4_workspaces', 'm4_users', 'm4_workspace_users')
    ) LOOP
        -- Verifica se a tabela possui deleted_at
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
END $$;

-- Políticas Core Manuais
DROP POLICY IF EXISTS "Workspace Member Visibility" ON public.m4_workspaces;
CREATE POLICY "Workspace Member Visibility" ON public.m4_workspaces FOR SELECT TO authenticated USING (id IN (SELECT workspace_id FROM public.m4_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "User Profile Visibility" ON public.m4_users;
CREATE POLICY "User Profile Visibility" ON public.m4_users FOR SELECT TO authenticated USING (workspace_id = public.get_current_workspace_id());

DROP POLICY IF EXISTS "User Update Private" ON public.m4_users;
CREATE POLICY "User Update Private" ON public.m4_users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ============================================
-- 8. SEEDS RESILIENTES (DADOS INICIAIS)
-- ============================================

-- 1. Workspace Principal
INSERT INTO public.m4_workspaces (id, name)
VALUES ('fb786658-1234-4321-8888-999988887777', 'Workspace Principal')
ON CONFLICT (id) DO NOTHING;

-- 2. Cargo Owner
INSERT INTO public.m4_job_roles (id, workspace_id, name, level, permissions)
VALUES ('d167f4e8-4a19-4ab7-b655-f104004f8bf1', 'fb786658-1234-4321-8888-999988887777', 'Owner', 100, '{"all": true}')
ON CONFLICT (id) DO NOTHING;

-- 3. Usuário Admin
INSERT INTO public.m4_users (id, name, email, role, job_role_id, workspace_id, status)
VALUES ('d167f4e8-4a19-4ab7-b655-f104004f8bf0', 'Administrador', 'admin@crm.com', 'owner', 'd167f4e8-4a19-4ab7-b655-f104004f8bf1', 'fb786658-1234-4321-8888-999988887777', 'active')
ON CONFLICT (id) DO NOTHING;

-- 4. Pipelines de Exemplo
INSERT INTO public.m4_pipelines (id, workspace_id, name, position)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fb786658-1234-4321-8888-999988887777', 'Vendas Comercial', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.m4_pipeline_stages (id, pipeline_id, workspace_id, name, position, status)
VALUES 
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fb786658-1234-4321-8888-999988887777', 'Lead', 0, 'inicial'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fb786658-1234-4321-8888-999988887777', 'Proposta', 1, 'intermediario'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fb786658-1234-4321-8888-999988887777', 'Ganho', 2, 'ganho')
ON CONFLICT (id) DO NOTHING;

-- 5. Categorias Financeiras Base
INSERT INTO public.m4_fin_categories (id, workspace_id, name, type, impacts_dre, dre_group)
VALUES
('11111111-1111-1111-1111-111111111101', 'fb786658-1234-4321-8888-999988887777', 'Vendas de Produtos', 'income', true, 'Receita Operacional'),
('11111111-1111-1111-1111-111111111102', 'fb786658-1234-4321-8888-999988887777', 'Vendas de Serviços', 'income', true, 'Receita Operacional'),
('22222222-2222-2222-2222-222222222201', 'fb786658-1234-4321-8888-999988887777', 'Salários', 'expense', true, 'Despesa com Pessoal'),
('22222222-2222-2222-2222-222222222202', 'fb786658-1234-4321-8888-999988887777', 'Softwares / SaaS', 'expense', true, 'Despesas Fixas')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 9. GRANTS FINAIS (SEGURANÇA SUPABASE)
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, authenticated, service_role;

COMMENT ON SCHEMA public IS 'Schema public Restaurado - M4 CRM Full Suite (Pronto para USO)';
