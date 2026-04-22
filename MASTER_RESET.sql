-- =========================================================
-- 🚀 MASTER_RESET.sql
-- Script de instalação e reset do banco CRMM4
-- =========================================================

-- 1. LIMPEZA TOTAL
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'm4_%') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- 2. ENUMS
DO $$ 
BEGIN
    -- Finance Enums
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
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Enums logic error: %', SQLERRM;
END $$;

-- 3. ESTRUTURA BASE
CREATE TABLE m4_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    branding_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Perfil de Usuário vinculado ao Auth do Supabase
CREATE TABLE m4_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'user')),
    avatar_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE m4_workspace_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, user_id)
);

-- 4. CRM
CREATE TABLE m4_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE m4_pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES m4_pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT 'blue',
    position INTEGER DEFAULT 0,
    status TEXT DEFAULT 'intermediario',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE m4_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cnpj TEXT,
    website TEXT,
    niche TEXT,
    email TEXT,
    whatsapp TEXT,
    city TEXT,
    state TEXT,
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE m4_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    company_id UUID REFERENCES m4_companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    email TEXT,
    whatsapp TEXT,
    linkedin TEXT,
    notes TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE m4_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    pipeline_id UUID REFERENCES m4_pipelines(id) ON DELETE SET NULL,
    stage_id UUID REFERENCES m4_pipeline_stages(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active',
    
    company_name TEXT NOT NULL DEFAULT 'Sem empresa',
    company_cnpj TEXT,
    company_city TEXT,
    company_state TEXT,
    company_niche TEXT,
    company_website TEXT,
    company_email TEXT,
    company_instagram TEXT,
    company_linkedin TEXT,
    company_whatsapp TEXT,
    
    contact_name TEXT NOT NULL DEFAULT 'Sem nome',
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
    
    responsible_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES m4_companies(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES m4_contacts(id) ON DELETE SET NULL,
    
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    custom_fields JSONB DEFAULT '{}'::jsonb,
    interactions JSONB DEFAULT '[]'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE m4_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES m4_leads(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    note TEXT,
    success BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. OPERAÇÕES
CREATE TABLE m4_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    default_price DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE m4_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES m4_leads(id) ON DELETE SET NULL,
    company_id UUID REFERENCES m4_companies(id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active',
    contract_start_date DATE,
    monthly_value DECIMAL(12, 2) DEFAULT 0,
    services JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE m4_client_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES m4_leads(id) ON DELETE SET NULL,
    company_id UUID REFERENCES m4_companies(id) ON DELETE SET NULL,
    client_id UUID REFERENCES m4_clients(id) ON DELETE SET NULL,
    service_type TEXT,
    monthly_value DECIMAL(12, 2) DEFAULT 0,
    billing_model TEXT DEFAULT 'recorrente',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    due_day INTEGER DEFAULT 5,
    status TEXT DEFAULT 'ativo',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE m4_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES m4_leads(id) ON DELETE SET NULL,
    client_id UUID REFERENCES m4_clients(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Pendente',
    priority TEXT DEFAULT 'Média',
    due_date TIMESTAMPTZ,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'task',
    is_recurring BOOLEAN DEFAULT false,
    checklist JSONB DEFAULT '[]'::jsonb,
    actual_hours DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE m4_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    client_id UUID REFERENCES m4_clients(id) ON DELETE SET NULL,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE m4_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES m4_leads(id) ON DELETE SET NULL,
    subject TEXT,
    body TEXT,
    direction TEXT DEFAULT 'inbound',
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE m4_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    content TEXT,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE m4_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    budget DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE m4_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE UNIQUE,
    crm_name TEXT DEFAULT 'M4 CRM',
    company_name TEXT DEFAULT 'Agency Cloud',
    logo_url TEXT,
    primary_color TEXT DEFAULT '#2563eb',
    theme TEXT DEFAULT 'light',
    language TEXT DEFAULT 'pt-BR',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE m4_credit_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    last_four TEXT,
    expiry TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. FINANCEIRO (NOVO MÓDULO)
CREATE TABLE m4_fin_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type fin_category_type NOT NULL DEFAULT 'both',
    parent_id UUID REFERENCES public.m4_fin_categories(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    "order" INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    impacts_dre BOOLEAN DEFAULT true,
    dre_group TEXT,
    classification_type fin_classification_type DEFAULT 'operacional',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE m4_fin_cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE m4_fin_counterparties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type fin_counterparty_type DEFAULT 'outro',
    document TEXT,
    email TEXT,
    whatsapp TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE m4_fin_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE m4_fin_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE m4_fin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    type fin_transaction_type NOT NULL,
    status fin_transaction_status DEFAULT 'pending',
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. SEED DATA
-- Workspace Principal
INSERT INTO m4_workspaces (id, name)
VALUES ('fb786658-1234-4321-8888-999988887777', 'Workspace Principal')
ON CONFLICT (id) DO NOTHING;

-- Pipelines e Stages Fixos
INSERT INTO m4_pipelines (id, workspace_id, name, position)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fb786658-1234-4321-8888-999988887777', 'Vendas Comercial', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO m4_pipeline_stages (id, pipeline_id, name, position, status)
VALUES 
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lead', 0, 'inicial'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Qualificação', 1, 'intermediario'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Proposta', 2, 'intermediario'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Fechamento', 3, 'ganho')
ON CONFLICT (id) DO NOTHING;

-- 8. PERMISSÕES E RLS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Disable RLS for development or use "allow all"
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'm4_%'
    LOOP
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY;', t);
    END LOOP;
END $$;

-- 9. RELOAD
NOTIFY pgrst, 'reload schema';
