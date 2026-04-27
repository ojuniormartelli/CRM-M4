-- 🚀 SCRIPT DE INSTALACAO COMPLETA (M4 CRM & Agency Suite)
-- AVISO: Este script apaga todas as tabelas existentes para uma instalacao limpa.

-- 1. LIMPEZA TOTAL (ATENÇÃO: APAGA TUDO!)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Apaga Tabelas
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'm4_%') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;

    -- Apaga Tipos/Enums (Opcional, mas recomendado para reset limpo)
    DROP TYPE IF EXISTS fin_transaction_type CASCADE;
    DROP TYPE IF EXISTS fin_transaction_status CASCADE;
    DROP TYPE IF EXISTS fin_category_type CASCADE;
    DROP TYPE IF EXISTS fin_classification_type CASCADE;
    DROP TYPE IF EXISTS fin_counterparty_type CASCADE;
    DROP TYPE IF EXISTS fin_bank_account_type CASCADE;
END $$;

-- 2. ENUMS FINANCEIROS
DO $$ 
BEGIN
    DROP TYPE IF EXISTS fin_transaction_type CASCADE;
    CREATE TYPE fin_transaction_type AS ENUM ('income', 'expense', 'transfer', 'adjustment');
    
    DROP TYPE IF EXISTS fin_transaction_status CASCADE;
    CREATE TYPE fin_transaction_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'canceled');
    
    DROP TYPE IF EXISTS fin_category_type CASCADE;
    CREATE TYPE fin_category_type AS ENUM ('income', 'expense', 'both');
    
    DROP TYPE IF EXISTS fin_classification_type CASCADE;
    CREATE TYPE fin_classification_type AS ENUM ('operacional', 'nao_operacional', 'financeiro', 'tributario');
    
    DROP TYPE IF EXISTS fin_counterparty_type CASCADE;
    CREATE TYPE fin_counterparty_type AS ENUM ('cliente', 'fornecedor', 'colaborador', 'parceiro', 'outro');
    
    DROP TYPE IF EXISTS fin_bank_account_type CASCADE;
    CREATE TYPE fin_bank_account_type AS ENUM ('checking', 'savings', 'cash', 'credit_account', 'investment');
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Erro ao criar Enums: %', SQLERRM;
END $$;

-- 3. NÚCLEO TENANT (Workspaces & Usuários)
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
    password TEXT DEFAULT 'admin123',
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

-- 4. CRM E OPERAÇÕES
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
    manager_id UUID,
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
    lead_id UUID REFERENCES public.m4_leads(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.m4_clients(id) ON DELETE SET NULL,
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
    sender_name TEXT,
    sender_email TEXT,
    recipient_email TEXT,
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
    open_rate TEXT DEFAULT '-',
    click_rate TEXT DEFAULT '-',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_posts (
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
CREATE TABLE public.m4_fin_categories (
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

CREATE TABLE public.m4_fin_cost_centers (
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

CREATE TABLE public.m4_fin_counterparties (
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

CREATE TABLE public.m4_fin_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_fin_bank_accounts (
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

CREATE TABLE public.m4_fin_transactions (
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

CREATE TABLE public.m4_fin_budgets (
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

-- 6. SEEDS INICIAIS
INSERT INTO public.m4_workspaces (id, name)
VALUES ('fb786658-1234-4321-8888-999988887777', 'Workspace Principal')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.m4_job_roles (id, workspace_id, name, level, permissions)
VALUES ('d167f4e8-4a19-4ab7-b655-f104004f8bf1', 'fb786658-1234-4321-8888-999988887777', 'Owner', 100, '{"all": true}')
ON CONFLICT (id) DO NOTHING;

-- Admin Padrão
INSERT INTO public.m4_users (id, name, email, password, role, job_role_id, workspace_id, status, must_change_password)
VALUES ('d167f4e8-4a19-4ab7-b655-f104004f8bf0', 'Administrador', 'admin@crm.com', 'admin123', 'owner', 'd167f4e8-4a19-4ab7-b655-f104004f8bf1', 'fb786658-1234-4321-8888-999988887777', 'active', true)
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

-- Ativar RLS em todas
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'm4_%') LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all access" ON %I', t);
        EXECUTE format('CREATE POLICY "Allow all access" ON %I FOR ALL USING (true)', t);
    END LOOP;
END $$;

-- ✅ SCRIPT DE INSERTS - CADASTROS BÁSICOS DO CRM
-- Execute este script APÓS criar as tabelas com o script anterior
-- Este script insere: Categorias, Centros de Custos e Formas de Pagamento
-- 🔧 VARIÁVEIS DE CONFIGURAÇÃO
-- Workspace ID padrão (deve ser o mesmo do script anterior)
-- Se seu workspace_id for diferente, substitua 'fb786658-1234-4321-8888-999988887777' por seu ID
-- ============================================
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
-- ============================================
-- 5. VERIFICAÇÃO - CONTAR REGISTROS INSERIDOS
-- ============================================
-- Execute estas queries para verificar se os dados foram inseridos corretamente:
-- SELECT COUNT(*) as "Total de Categorias" FROM public.m4_fin_categories WHERE workspace_id = 'fb786658-1234-4321-8888-999988887777';
-- SELECT COUNT(*) as "Total de Centros de Custos" FROM public.m4_fin_cost_centers WHERE workspace_id = 'fb786658-1234-4321-8888-999988887777';
-- SELECT COUNT(*) as "Total de Formas de Pagamento" FROM public.m4_fin_payment_methods WHERE workspace_id = 'fb786658-1234-4321-8888-999988887777';
-- ============================================
-- 6. RESULTADO ESPERADO
-- ============================================
-- ✅ 25 Categorias inseridas (10 receitas + 15 despesas)
-- ✅ 10 Centros de Custos inseridos
-- ✅ 10 Formas de Pagamento inseridas
