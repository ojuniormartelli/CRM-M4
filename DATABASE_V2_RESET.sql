-- Standardized Schema v2 (M4 CRM & Agency Suite)
-- Prefix: m4_
-- Created for complete reset

-- 1. WORKSPACES
CREATE TABLE IF NOT EXISTS m4_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    branding_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. USERS (Link to auth.users)
CREATE TABLE IF NOT EXISTS m4_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. WORKSPACE USERS (Many-to-Many mapping)
CREATE TABLE IF NOT EXISTS m4_workspace_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, user_id)
);

-- 4. PIPELINES
CREATE TABLE IF NOT EXISTS m4_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. PIPELINE STAGES
CREATE TABLE IF NOT EXISTS m4_pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES m4_pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT 'blue',
    position INTEGER DEFAULT 0,
    status TEXT DEFAULT 'inicial', -- FunnelStatus: inicial, intermediario, ganho, perdido
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. COMPANIES
CREATE TABLE IF NOT EXISTS m4_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cnpj TEXT,
    website TEXT,
    niche TEXT,
    email TEXT,
    whatsapp TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. CONTACTS
CREATE TABLE IF NOT EXISTS m4_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    company_id UUID REFERENCES m4_companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    email TEXT,
    whatsapp TEXT,
    linkedin TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. LEADS
CREATE TABLE IF NOT EXISTS m4_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    pipeline_id UUID REFERENCES m4_pipelines(id) ON DELETE SET NULL,
    stage_id UUID REFERENCES m4_pipeline_stages(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active', -- active, won, lost, paused
    
    -- Fast access denormalized data
    company_name TEXT NOT NULL,
    company_whatsapp TEXT,
    contact_name TEXT NOT NULL,
    contact_whatsapp TEXT,
    email TEXT,
    whatsapp TEXT,
    website TEXT,
    niche TEXT,
    city TEXT,
    state TEXT,
    
    -- Business Data
    value DECIMAL(12, 2) DEFAULT 0,
    temperature TEXT DEFAULT 'Frio', -- Frio, Morno, Quente
    probability INTEGER DEFAULT 0,
    source TEXT,
    campaign TEXT,
    next_action TEXT,
    next_action_date DATE,
    closing_forecast DATE,
    
    -- External Relations
    responsible_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES m4_companies(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES m4_contacts(id) ON DELETE SET NULL,
    
    -- Tracking
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    custom_fields JSONB DEFAULT '{}'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. INTERACTIONS
CREATE TABLE IF NOT EXISTS m4_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES m4_leads(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- WhatsApp, Ligação, E-mail, Reunião, Outro
    note TEXT,
    success BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. SERVICES
CREATE TABLE IF NOT EXISTS m4_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    default_price DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. CLIENT ACCOUNTS (Recurring Billing)
CREATE TABLE IF NOT EXISTS m4_client_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES m4_leads(id) ON DELETE SET NULL,
    company_id UUID REFERENCES m4_companies(id) ON DELETE SET NULL,
    service_type TEXT,
    monthly_value DECIMAL(12, 2) DEFAULT 0,
    billing_model TEXT DEFAULT 'recorrente', -- recorrente, projeto
    start_date DATE NOT NULL,
    end_date DATE,
    due_day INTEGER DEFAULT 5,
    status TEXT DEFAULT 'ativo', -- ativo, suspenso, cancelado
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. PROJECTS
CREATE TABLE IF NOT EXISTS m4_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    client_account_id UUID REFERENCES m4_client_accounts(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'planejamento', -- planejamento, em_andamento, pausado, concluido
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. FINANCEIRO (ESTRUTURA COMPLETA)

-- Enums
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

CREATE TABLE IF NOT EXISTS public.m4_fin_categories (
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

CREATE TABLE IF NOT EXISTS public.m4_fin_cost_centers (
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

CREATE TABLE IF NOT EXISTS public.m4_fin_counterparties (
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

CREATE TABLE IF NOT EXISTS public.m4_fin_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_bank_accounts (
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

CREATE TABLE IF NOT EXISTS public.m4_fin_transactions (
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
    bank_account_id UUID REFERENCES public.m4_fin_bank_accounts(id),
    destination_bank_account_id UUID REFERENCES public.m4_fin_bank_accounts(id),
    counterparty_id UUID REFERENCES public.m4_fin_counterparties(id),
    category_id UUID REFERENCES public.m4_fin_categories(id),
    cost_center_id UUID REFERENCES public.m4_fin_cost_centers(id),
    payment_method TEXT,
    reference_code TEXT,
    notes TEXT,
    attachment_url TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_group_id UUID,
    recurrence_frequency TEXT,
    recurrence_interval INTEGER DEFAULT 1,
    recurrence_end_date DATE,
    parent_transaction_id UUID REFERENCES public.m4_fin_transactions(id),
    generation_mode TEXT DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.m4_fin_categories(id),
    dre_group TEXT,
    cost_center_id UUID REFERENCES public.m4_fin_cost_centers(id),
    period TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    scenario TEXT NOT NULL DEFAULT 'realistic',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. TASKS
CREATE TABLE IF NOT EXISTS m4_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES m4_projects(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES m4_leads(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Pendente', -- Pendente, Em Andamento, Concluído
    priority TEXT DEFAULT 'Média', -- Baixa, Média, Alta, Crítica
    due_date TIMESTAMPTZ,
    responsible_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'task',
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. FINANCE BANK ACCOUNTS
CREATE TABLE IF NOT EXISTS m4_fin_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'checking', -- checking, savings, investment, cash
    institution TEXT,
    balance DECIMAL(12, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 15. FINANCE CATEGORIES
CREATE TABLE IF NOT EXISTS m4_fin_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'both', -- income, expense, both
    color TEXT,
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. FINANCE TRANSACTIONS
CREATE TABLE IF NOT EXISTS m4_fin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    category_id UUID REFERENCES m4_fin_categories(id) ON DELETE SET NULL,
    bank_account_id UUID REFERENCES m4_fin_bank_accounts(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    type TEXT NOT NULL, -- income, expense, transfer
    status TEXT DEFAULT 'pending', -- pending, paid, canceled
    issue_date DATE DEFAULT CURRENT_DATE,
    competence_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    client_account_id UUID REFERENCES m4_client_accounts(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES m4_leads(id) ON DELETE SET NULL,
    company_id UUID REFERENCES m4_companies(id) ON DELETE SET NULL,
    payment_method TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. FINANCE PAYMENT METHODS
CREATE TABLE IF NOT EXISTS m4_fin_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 18. AUTOMATIONS
CREATE TABLE IF NOT EXISTS m4_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- lead, task, client
    trigger_type TEXT NOT NULL,
    trigger_conditions JSONB DEFAULT '[]'::jsonb,
    actions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 19. FORM TEMPLATES
CREATE TABLE IF NOT EXISTS m4_form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    questions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 20. FORM RESPONSES
CREATE TABLE IF NOT EXISTS m4_form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    form_id UUID REFERENCES m4_form_templates(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES m4_leads(id) ON DELETE CASCADE,
    answers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 21. EMAILS (Integration Sync)
CREATE TABLE IF NOT EXISTS m4_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES m4_leads(id) ON DELETE CASCADE,
    subject TEXT,
    body TEXT,
    sender TEXT,
    recipient TEXT,
    sent_at TIMESTAMPTZ,
    direction TEXT DEFAULT 'inbound', -- inbound, outbound
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 22. MARKETING POSTS
CREATE TABLE IF NOT EXISTS m4_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT,
    platform TEXT, -- Instagram, LinkedIn, etc
    status TEXT DEFAULT 'draft',
    publish_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 23. MARKETING CAMPAIGNS
CREATE TABLE IF NOT EXISTS m4_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    platform TEXT,
    budget DECIMAL(12, 2),
    status TEXT DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Basic RLS (Simplified for Workspace Isolation)
ALTER TABLE m4_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_workspace_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_fin_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_fin_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_fin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_automations ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy: user can see what belongs to their workspace
-- Note: Requires a helper function or mapping table check

CREATE OR REPLACE FUNCTION get_user_workspace_ids()
RETURNS setof uuid AS $$
    SELECT workspace_id FROM m4_workspace_users WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Apply workspace isolation policies
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name LIKE 'm4_%'
          AND table_name != 'm4_workspace_users'
          AND table_name != 'm4_workspaces'
    LOOP
        EXECUTE format('CREATE POLICY "Worskpace isolation for %I" ON %I USING (workspace_id IN (SELECT get_user_workspace_ids()));', t, t);
    END LOOP;
END $$;

-- Policy for workspaces
CREATE POLICY "Users can only see workspaces they belong to" ON m4_workspaces
    USING (id IN (SELECT get_user_workspace_ids()));

-- Policy for workspace_users
CREATE POLICY "Users can see their own memberships" ON m4_workspace_users
    FOR SELECT USING (user_id = auth.uid());
