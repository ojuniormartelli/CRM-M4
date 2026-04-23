import React, { useState } from "react";
import { ICONS } from "../constants";

const TechnicalPanel: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleResetConfig = () => {
    if (
      window.confirm(
        "Tem certeza que deseja reconfigurar a conexão? Isso limpará as credenciais do Supabase salvas localmente.",
      )
    ) {
      localStorage.removeItem("supabase_url");
      localStorage.removeItem("supabase_anon_key");
      localStorage.removeItem("m4_crm_user_id");
      window.location.reload();
    }
  };

  const seedSQL = `-- 🚀 SCRIPT DE SEED DE DADOS DE TESTE ENRIQUECIDO (M4 CRM)
-- Este script insere dados de exemplo realistas para demonstração completa das funcionalidades.

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
    SELECT id INTO v_stage_contact_id FROM m4_pipeline_stages WHERE pipeline_id = v_pipeline_vendas_id AND name = 'Primeiro Contato' LIMIT 1;
    SELECT id INTO v_stage_proposal_id FROM m4_pipeline_stages WHERE pipeline_id = v_pipeline_vendas_id AND name = 'Proposta Enviada' LIMIT 1;
    SELECT id INTO v_stage_negotiation_id FROM m4_pipeline_stages WHERE pipeline_id = v_pipeline_vendas_id AND name = 'Negociação' LIMIT 1;

    -- 3. Garantir usuário admin
    SELECT id INTO v_admin_id FROM m4_users WHERE email = 'admin@m4.com' LIMIT 1;
    IF v_admin_id IS NULL THEN
        v_admin_id := gen_random_uuid();
        INSERT INTO m4_users (id, name, email, role, workspace_id, status)
        VALUES (v_admin_id, 'Administrador M4', 'admin@m4.com', 'owner', v_workspace_id, 'active');
    END IF;

    -- 4. Inserir Empresas de Exemplo com Nichos
    INSERT INTO m4_companies (id, name, niche, city, state, workspace_id)
    VALUES 
    (gen_random_uuid(), 'Tech Soluções LTDA', 'Tecnologia SaaS', 'São Paulo', 'SP', v_workspace_id),
    (gen_random_uuid(), 'Alimentos Brasil S.A.', 'Indústria Alimentícia', 'Curitiba', 'PR', v_workspace_id),
    (gen_random_uuid(), 'Moda Fashion Brasil', 'Varejo / Moda', 'Rio de Janeiro', 'RJ', v_workspace_id)
    ON CONFLICT DO NOTHING;

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

  const fullSetupSQL = `-- 🚀 SCRIPT DE INSTALACAO COMPLETA (M4 CRM & Agency Suite)
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
    updated_at TIMESTAMPTZ DEFAULT now()
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
    created_at TIMESTAMPTZ DEFAULT now()
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
    created_at TIMESTAMPTZ DEFAULT now()
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
`;

  const updateSQL = `-- 🚀 SCRIPT DE ATUALIZACAO SEGURA (Nucleo Multi-Tenant)
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

  const migrationSQL = `-- 🚀 MIGRACAO DE DADOS: LEGADO -> M4_FIN
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

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="h-full overflow-y-auto pr-4 scrollbar-none max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-blue-100">
          <ICONS.Settings />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Painel Técnico SQL
          </h2>
          <p className="text-slate-500 font-medium italic">
            Gerencie a estrutura do seu banco de dados de forma simplificada.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Opção 1: Setup Completo */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                1. Reset & Instalação Total
              </h3>
              <p className="text-xs font-bold text-red-500 mt-1 uppercase tracking-widest">
                ⚠️ APAGA TUDO E RECOMEÇA DO ZERO
              </p>
            </div>
            <button
              onClick={() => handleCopy(fullSetupSQL, "full")}
              className={`p-4 rounded-2xl transition-all ${copied === "full" ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white"}`}
            >
              {copied === "full" ? "Copiado!" : "Copiar SQL"}
            </button>
          </div>
          <div className="relative">
            <pre className="bg-slate-900 text-blue-300 p-8 rounded-[1.75rem] text-[10px] font-mono overflow-x-auto max-h-[300px] scrollbar-thin">
              {fullSetupSQL}
            </pre>
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-900 to-transparent rounded-b-[1.75rem]"></div>
          </div>
          <div className="mt-8 p-6 bg-red-50 rounded-2xl border border-red-100 flex gap-4">
            <div className="text-red-500">
              <ICONS.Plus className="rotate-45" />
            </div>
            <p className="text-[11px] font-bold text-red-700 leading-relaxed uppercase">
              CUIDADO: Este script apaga permanentemente todos os dados das tabelas 'm4_' 
              e reinstala o sistema do zero.
            </p>
          </div>
        </div>

        {/* Opção 2: Atualização Segura */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-xl transition-all group bg-blue-50/10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-black text-blue-900 dark:text-blue-400 uppercase tracking-tight">
                2. Atualização Segura
              </h3>
              <p className="text-xs font-bold text-blue-400 mt-1 uppercase tracking-widest">
                Sem apagar dados
              </p>
            </div>
            <button
              onClick={() => handleCopy(updateSQL, "update")}
              className={`p-4 rounded-2xl transition-all ${copied === "update" ? "bg-emerald-500 text-white" : "bg-blue-50 text-blue-400 hover:bg-blue-600 hover:text-white"}`}
            >
              {copied === "update" ? "Copiado!" : "Copiar SQL"}
            </button>
          </div>
          <div className="relative">
            <pre className="bg-slate-900 text-indigo-300 p-8 rounded-[1.75rem] text-[10px] font-mono overflow-x-auto max-h-[300px] scrollbar-thin">
              {updateSQL}
            </pre>
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-900 to-transparent rounded-b-[1.75rem]"></div>
          </div>
          <div className="mt-8 p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-4">
            <div className="text-emerald-500">
              <ICONS.Automation />
            </div>
            <p className="text-[11px] font-bold text-emerald-700 leading-relaxed uppercase">
              Use este script para atualizar um banco existente. Ele adiciona
              novas colunas e tabelas sem afetar seus dados.
            </p>
          </div>
        </div>

        {/* Opção 3: Dados de Teste (Seed) */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-emerald-200 dark:border-emerald-800 shadow-sm hover:shadow-xl transition-all group bg-emerald-50/10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-tight">
                3. Dados de Teste (Seed)
              </h3>
              <p className="text-xs font-bold text-emerald-400 mt-1 uppercase tracking-widest">
                Popular para demonstração
              </p>
            </div>
            <button
              onClick={() => handleCopy(seedSQL, "seed")}
              className={`p-4 rounded-2xl transition-all ${copied === "seed" ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-400 hover:bg-blue-600 hover:text-white"}`}
            >
              {copied === "seed" ? "Copiado!" : "Copiar SQL"}
            </button>
          </div>
          <div className="relative">
            <pre className="bg-slate-900 text-emerald-300 p-8 rounded-[1.75rem] text-[10px] font-mono overflow-x-auto max-h-[300px] scrollbar-thin">
              {seedSQL}
            </pre>
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-900 to-transparent rounded-b-[1.75rem]"></div>
          </div>
          <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4">
            <div className="text-blue-500">
              <ICONS.Database />
            </div>
            <p className="text-[11px] font-bold text-blue-700 leading-relaxed uppercase">
              Use este script para popular o banco com leads, empresas e 
              lançamentos financeiros de exemplo.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-12 rounded-[3.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="flex-1 space-y-4">
          <h4 className="text-2xl font-black uppercase tracking-tight">
            Migração de Dados
          </h4>
          <p className="text-slate-400 font-medium text-sm">
            Use este script para migrar dados das tabelas antigas para a nova
            estrutura financeira (m4_fin).
          </p>
          <button
            onClick={() => handleCopy(migrationSQL, "migration")}
            className={`px-8 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${copied === "migration" ? "bg-emerald-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`}
          >
            {copied === "migration" ? "Copiado!" : "Copiar SQL de Migração"}
          </button>
        </div>
        <div className="w-48 h-48 bg-blue-600/20 rounded-[2.5rem] border border-blue-500/30 flex items-center justify-center">
          <ICONS.Database size={48} className="text-blue-400" />
        </div>
      </div>

      <div className="bg-slate-900 p-12 rounded-[3.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="flex-1 space-y-4">
          <h4 className="text-2xl font-black uppercase tracking-tight">
            Como Aplicar?
          </h4>
          <ol className="space-y-3 text-slate-400 font-medium text-sm list-decimal ml-5">
            <li>
              Acesse o dashboard do seu projeto no{" "}
              <a
                href="https://supabase.com"
                target="_blank"
                className="text-blue-400 hover:underline"
              >
                Supabase
              </a>
              .
            </li>
            <li>
              No menu lateral esquerdo, clique em{" "}
              <span className="text-white font-bold">"SQL Editor"</span>.
            </li>
            <li>
              Clique em{" "}
              <span className="text-white font-bold">"+ New Query"</span>.
            </li>
            <li>
              Cole o código copiado aqui e clique em{" "}
              <span className="text-blue-500 font-black italic">"RUN"</span>.
            </li>
            <li>Pronto! Seu CRM estará atualizado.</li>
          </ol>
        </div>
        <div className="w-48 h-48 bg-blue-600/20 rounded-[2.5rem] border border-blue-500/30 flex items-center justify-center animate-pulse">
          <ICONS.Search />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-12 p-10 bg-rose-50 dark:bg-rose-950/20 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/30">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h3 className="text-xl font-black text-rose-900 dark:text-rose-400 uppercase tracking-tight">
              Zona de Perigo
            </h3>
            <p className="text-sm font-bold text-rose-600 dark:text-rose-500 uppercase tracking-widest mt-1">
              Ações irreversíveis de configuração
            </p>
          </div>
          <button
            onClick={handleResetConfig}
            className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 dark:shadow-none"
          >
            Reconfigurar Conexão (Reset)
          </button>
        </div>
      </div>
    </div>
  );
};

export default TechnicalPanel;
