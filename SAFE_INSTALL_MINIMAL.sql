-- 🚀 SCRIPT DE INSTALAÇÃO COMPLETA E SEGURA (M4 CRM & Agency Suite)
-- Este script reconstrói todo o sistema de CRM e Financeiro do zero.
-- Ideal para ser executado após o script de RESET TOTAL.

-- ============================================
-- 1. ENUMS FINANCEIROS
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
END $$;

-- ============================================
-- 2. NÚCLEO TENANT (Workspaces & Usuários)
-- ============================================
CREATE TABLE IF NOT EXISTS public.m4_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    branding_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'user')),
    avatar_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. CRM E OPERAÇÕES
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
    position INTEGER DEFAULT 0,
    status TEXT DEFAULT 'intermediario',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cnpj TEXT,
    niche TEXT,
    city TEXT,
    state TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.m4_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.m4_companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    whatsapp TEXT,
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
    status TEXT DEFAULT 'active',
    contact_name TEXT,
    contact_email TEXT,
    value DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.m4_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.m4_companies(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'Pendente',
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- ============================================
-- 4. FINANCEIRO (m4_fin_*)
-- ============================================
CREATE TABLE IF NOT EXISTS public.m4_fin_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type fin_category_type NOT NULL DEFAULT 'both',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type fin_bank_account_type DEFAULT 'checking',
    balance NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    type fin_transaction_type NOT NULL,
    status fin_transaction_status DEFAULT 'pending',
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    due_date DATE NOT NULL,
    competence_date DATE NOT NULL,
    bank_account_id UUID REFERENCES public.m4_fin_bank_accounts(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.m4_fin_categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. FUNÇÕES E RLS COMPLETO
-- ============================================

-- Função Helper de Workspace
CREATE OR REPLACE FUNCTION public.get_current_workspace_id() 
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT workspace_id FROM public.m4_users WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Ativar e Configurar RLS em Massa
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'm4_%') LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Workspace Access" ON %I', t);
    END LOOP;
END $$;

-- Aplicar Políticas de Isolamento
CREATE POLICY "Workspace Access" ON m4_leads FOR ALL TO authenticated USING (workspace_id = public.get_current_workspace_id() AND deleted_at IS NULL) WITH CHECK (workspace_id = public.get_current_workspace_id());
CREATE POLICY "Workspace Access" ON m4_companies FOR ALL TO authenticated USING (workspace_id = public.get_current_workspace_id() AND deleted_at IS NULL) WITH CHECK (workspace_id = public.get_current_workspace_id());
CREATE POLICY "Workspace Access" ON m4_contacts FOR ALL TO authenticated USING (workspace_id = public.get_current_workspace_id() AND deleted_at IS NULL) WITH CHECK (workspace_id = public.get_current_workspace_id());
CREATE POLICY "Workspace Access" ON m4_tasks FOR ALL TO authenticated USING (workspace_id = public.get_current_workspace_id() AND deleted_at IS NULL) WITH CHECK (workspace_id = public.get_current_workspace_id());
CREATE POLICY "Workspace Access" ON m4_pipelines FOR ALL TO authenticated USING (workspace_id = public.get_current_workspace_id()) WITH CHECK (workspace_id = public.get_current_workspace_id());
CREATE POLICY "Workspace Access" ON m4_pipeline_stages FOR ALL TO authenticated USING (workspace_id = public.get_current_workspace_id()) WITH CHECK (workspace_id = public.get_current_workspace_id());
CREATE POLICY "Workspace Access" ON m4_fin_categories FOR ALL TO authenticated USING (workspace_id = public.get_current_workspace_id()) WITH CHECK (workspace_id = public.get_current_workspace_id());
CREATE POLICY "Workspace Access" ON m4_fin_bank_accounts FOR ALL TO authenticated USING (workspace_id = public.get_current_workspace_id()) WITH CHECK (workspace_id = public.get_current_workspace_id());
CREATE POLICY "Workspace Access" ON m4_fin_transactions FOR ALL TO authenticated USING (workspace_id = public.get_current_workspace_id()) WITH CHECK (workspace_id = public.get_current_workspace_id());

-- ============================================
-- 6. DADOS INICIAIS (SEED)
-- ============================================
INSERT INTO public.m4_workspaces (id, name) VALUES ('fb786658-1234-4321-8888-999988887777', 'Workspace Principal') ON CONFLICT DO NOTHING;
INSERT INTO public.m4_users (id, name, email, role, workspace_id, status) VALUES ('d167f4e8-4a19-4ab7-b655-f104004f8bf0', 'Administrador', 'admin@crm.com', 'owner', 'fb786658-1234-4321-8888-999988887777', 'active') ON CONFLICT DO NOTHING;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
