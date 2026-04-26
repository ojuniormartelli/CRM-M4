export const SEED_SQL = `-- 🚀 SCRIPT DE SEED DE DADOS DE TESTE ENRIQUECIDO (M4 CRM)
-- Este script insere dados de exemplo realistas para demonstração completa das funcionalidades.

-- Garantir coluna company_id em m4_tasks (Migração rápida)
ALTER TABLE IF EXISTS m4_tasks ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.m4_companies(id) ON DELETE SET NULL;

DO $$ 
DECLARE
    v_workspace_id UUID := 'fb786658-1234-4321-8888-999988887777'; -- Workspace Principal
    v_admin_id UUID;
    v_pipeline_vendas_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_stage_lead_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    v_stage_contact_id UUID;
    v_stage_proposal_id UUID;
    v_stage_negotiation_id UUID;
    v_company_tech_id UUID;
    v_company_food_id UUID;
    v_company_fashion_id UUID;
    v_cat_vendas_id UUID;
    v_cat_aluguel_id UUID;
    v_cat_salarios_id UUID;
    v_bank_pj_id UUID;
BEGIN
    -- 1. Verificar se o Workspace existe
    IF NOT EXISTS (SELECT 1 FROM m4_workspaces WHERE id = v_workspace_id) THEN
        INSERT INTO m4_workspaces (id, name) VALUES (v_workspace_id, 'Workspace Principal');
    END IF;

    -- 2. Garantir etapas extras do funil para dados realistas
    -- (Usando estágios do FULL_SETUP_SQL: Lead, Qualificação, Proposta, Fechamento)
    v_stage_contact_id := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'; -- Lead
    v_stage_proposal_id := 'dddddddd-dddd-dddd-dddd-ddddbbbbbbbb'; -- Proposta
    v_stage_negotiation_id := 'cccccccc-cccc-cccc-cccc-cccccccccccc'; -- Qualificação

    -- 2.1 Garantir Admin Principal
    IF NOT EXISTS (SELECT 1 FROM m4_users WHERE email = 'admin@crm.com') THEN
        INSERT INTO m4_users (id, name, email, password, role, workspace_id, status, must_change_password)
        VALUES ('d167f4e8-4a19-4ab7-b655-f104004f8bf0', 'Administrador', 'admin@crm.com', 'admin123', 'owner', v_workspace_id, 'active', true);
    END IF;

    -- 3. Garantir Workspace Principal
    IF NOT EXISTS (SELECT 1 FROM m4_workspaces WHERE id = v_workspace_id) THEN
        INSERT INTO m4_workspaces (id, name) VALUES (v_workspace_id, 'Workspace Principal');
    END IF;

    -- 4. Inserir Empresas de Exemplo com Nichos
    INSERT INTO m4_companies (id, name, niche, city, state, workspace_id)
    VALUES 
    (gen_random_uuid(), 'Tech Soluções LTDA', 'Tecnologia SaaS', 'São Paulo', 'SP', v_workspace_id),
    (gen_random_uuid(), 'Alimentos Brasil S.A.', 'Indústria Alimentícia', 'Curitiba', 'PR', v_workspace_id),
    (gen_random_uuid(), 'Moda Fashion Brasil', 'Varejo / Moda', 'Rio de Janeiro', 'RJ', v_workspace_id)
    ON CONFLICT (id) DO NOTHING;

    SELECT id INTO v_company_tech_id FROM m4_companies WHERE name = 'Tech Soluções LTDA' LIMIT 1;
    SELECT id INTO v_company_food_id FROM m4_companies WHERE name = 'Alimentos Brasil S.A.' LIMIT 1;
    SELECT id INTO v_company_fashion_id FROM m4_companies WHERE name = 'Moda Fashion Brasil' LIMIT 1;

    -- 5. Inserir Leads com Valores e Probabilidades Reais
    INSERT INTO m4_leads (contact_name, company_name, contact_email, value, status, pipeline_id, stage_id, workspace_id, company_id, responsible_id, probability, temperature, company_niche, source)
    VALUES 
    ('Consultoria Digital TECH', 'Tech Soluções LTDA', 'diretoria@tech.com', 45000.00, 'active', v_pipeline_vendas_id, v_stage_negotiation_id, v_workspace_id, v_company_tech_id, v_admin_id, 80, 'Quente', 'Tecnologia', 'Instagram'),
    ('Expansão E-commerce FASHION', 'Moda Fashion Brasil', 'marketing@moda.com', 28000.00, 'active', v_pipeline_vendas_id, v_stage_proposal_id, v_workspace_id, v_company_fashion_id, v_admin_id, 60, 'Morno', 'Varejo', 'Indicação'),
    ('Contrato Fechado SAAS', 'Tech Soluções LTDA', 'fechado@tech.com', 15000.00, 'won', v_pipeline_vendas_id, v_stage_lead_id, v_workspace_id, v_company_tech_id, v_admin_id, 100, 'Quente', 'Software', 'Google'),
    ('Lead Perdido Exemplo', 'Alimentos Brasil S.A.', 'perda@alimentos.com', 5000.00, 'lost', v_pipeline_vendas_id, v_stage_lead_id, v_workspace_id, v_company_food_id, v_admin_id, 0, 'Frio', 'Alimentos', 'Outros'),
    ('Novo APP Mobile', 'Tech Soluções LTDA', 'app@tech.com', 120000.00, 'active', v_pipeline_vendas_id, v_stage_lead_id, v_workspace_id, v_company_tech_id, v_admin_id, 10, 'Frio', 'Software', 'YouTube')
    ON CONFLICT DO NOTHING;

    -- 6. Categorias Financeiras
    INSERT INTO m4_fin_categories (id, name, type, workspace_id)
    VALUES 
    (gen_random_uuid(), 'Vendas de CRM', 'income', v_workspace_id),
    (gen_random_uuid(), 'Aluguel Escritório', 'expense', v_workspace_id),
    (gen_random_uuid(), 'Folha de Pagamento', 'expense', v_workspace_id)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_cat_vendas_id FROM m4_fin_categories WHERE name = 'Vendas de CRM' LIMIT 1;
    SELECT id INTO v_cat_aluguel_id FROM m4_fin_categories WHERE name = 'Aluguel Escritório' LIMIT 1;
    SELECT id INTO v_cat_salarios_id FROM m4_fin_categories WHERE name = 'Folha de Pagamento' LIMIT 1;

    -- 7. Conta Bancária
    INSERT INTO m4_fin_bank_accounts (id, name, bank, type, balance, workspace_id, current_balance)
    VALUES (gen_random_uuid(), 'Banco Digital PJ', 'Nubank', 'checking', 25000.00, v_workspace_id, 25000.00)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_bank_pj_id FROM m4_fin_bank_accounts WHERE name = 'Banco Digital PJ' LIMIT 1;

    -- 8. Transações Financeiras (Lançamentos)
    INSERT INTO m4_fin_transactions (workspace_id, type, description, amount, status, due_date, competence_date, bank_account_id, category_id)
    VALUES 
    (v_workspace_id, 'income', 'Mensalidade Tech Soluções', 5000.00, 'paid', CURRENT_DATE - 5, CURRENT_DATE - 5, v_bank_pj_id, v_cat_vendas_id),
    (v_workspace_id, 'expense', 'Aluguel mensal', 3200.00, 'paid', CURRENT_DATE - 2, CURRENT_DATE - 2, v_bank_pj_id, v_cat_aluguel_id),
    (v_workspace_id, 'income', 'Projeto E-commerce Moda', 12000.00, 'pending', CURRENT_DATE + 10, CURRENT_DATE + 10, v_bank_pj_id, v_cat_vendas_id)
    ON CONFLICT DO NOTHING;

    -- 9. Tarefas de Exemplo
    INSERT INTO m4_tasks (workspace_id, title, description, status, priority, type, client_id, company_id)
    VALUES 
    (v_workspace_id, 'Setup de Automações TECH', 'Configurar filtros de leads no CRM', 'Em Execução', 'Alta', 'Operacional', NULL, v_company_tech_id),
    (v_workspace_id, 'Reunião de Alinhamento MODA', 'Follow-up da proposta de e-commerce', 'Pendente', 'Média', 'Comercial', NULL, v_company_fashion_id)
    ON CONFLICT DO NOTHING;

END $$;
`;

export const FULL_SETUP_SQL = `-- 🚀 SCRIPT DE INSTALACAO SEGURA (M4 CRM & Agency Suite)
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
    password TEXT DEFAULT 'admin123',
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
CREATE POLICY "Workspace Member Visibility" ON public.m4_workspaces
FOR SELECT TO authenticated
USING (id IN (SELECT workspace_id FROM public.m4_users WHERE id = auth.uid()));

-- m4_users: Usuários podem ver a si mesmos e colegas do mesmo workspace
CREATE POLICY "User Profile Visibility" ON public.m4_users
FOR SELECT TO authenticated
USING (workspace_id = public.get_current_workspace_id());

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

    -- 3. Cria novo Financeiro se não existir
    -- (O script full ja cobre isso, use-o para uma instalacao limpa ou execute as queries de m4_fin_ individuais)

    -- 4. Correção Schema Leads (Colunas Ausentes)
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

    -- 5. Índices de Performance
    CREATE INDEX IF NOT EXISTS idx_m4_leads_company_cnpj ON public.m4_leads(company_cnpj);
    CREATE INDEX IF NOT EXISTS idx_m4_leads_company_email ON public.m4_leads(company_email);
    CREATE INDEX IF NOT EXISTS idx_m4_leads_contact_email ON public.m4_leads(contact_email);
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
