
import React, { useState } from 'react';
import { ICONS } from '../constants';

const TechnicalPanel: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleResetConfig = () => {
    if (window.confirm('Tem certeza que deseja reconfigurar a conexão? Isso limpará as credenciais do Supabase salvas localmente.')) {
      localStorage.removeItem('supabase_url');
      localStorage.removeItem('supabase_anon_key');
      localStorage.removeItem('m4_crm_user_id');
      window.location.reload();
    }
  };

  const fullSetupSQL = `-- 🚀 SCRIPT DE INSTALAÇÃO COMPLETA (M4 CRM & Agency Suite)
-- Use este script apenas se estiver configurando do zero.

-- 1. Tabelas Base e Configurações
CREATE TABLE IF NOT EXISTS m4_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID UNIQUE,
    crm_name TEXT DEFAULT 'M4 CRM',
    logo_url TEXT,
    theme TEXT DEFAULT 'light',
    primary_color TEXT DEFAULT '#2563eb',
    company_name TEXT DEFAULT 'Agency Cloud',
    city TEXT,
    state TEXT,
    website_url TEXT,
    whatsapp_number TEXT,
    language TEXT DEFAULT 'pt-BR',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.m4_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  name text NOT NULL,
  cnpj text,
  city text,
  state text,
  segment text,
  website text,
  email text,
  phone text,
  whatsapp text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.m4_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  company_id uuid REFERENCES public.m4_companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  email text,
  phone text,
  whatsapp text,
  notes text,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Leads e Pipelines
CREATE TABLE IF NOT EXISTS m4_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    workspace_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m4_pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES m4_pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    color TEXT,
    workspace_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m4_leads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    company_id UUID REFERENCES public.m4_companies(id),
    contact_id UUID REFERENCES public.m4_contacts(id),
    email TEXT,
    phone TEXT,
    pipeline_id TEXT DEFAULT 'e167f4e8-4a19-4ab7-b655-f104004f8bf4',
    stage TEXT DEFAULT 'new',
    value NUMERIC DEFAULT 0,
    notes TEXT,
    niche TEXT,
    service_type TEXT,
    proposed_ticket NUMERIC DEFAULT 0,
    next_action TEXT,
    next_action_date DATE,
    qualification TEXT,
    source TEXT,
    campaign TEXT,
    city TEXT,
    state TEXT,
    closing_forecast DATE,
    temperature TEXT DEFAULT 'Frio',
    probability INTEGER DEFAULT 0,
    ai_score INTEGER DEFAULT 0,
    ai_reasoning TEXT,
    legal_name TEXT,
    website TEXT,
    company_email TEXT,
    company_instagram TEXT,
    company_linkedin TEXT,
    company_phone TEXT,
    contact_name TEXT,
    contact_role TEXT,
    contact_email TEXT,
    contact_instagram TEXT,
    contact_linkedin TEXT,
    contact_phone TEXT,
    contact_notes TEXT,
    business_notes TEXT,
    responsible_name TEXT,
    responsible_id TEXT,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'active',
    custom_fields JSONB DEFAULT '{}',
    workspace_id UUID,
    origin_lead_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tarefas e ClickUp Advanced
CREATE TABLE IF NOT EXISTS m4_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Pendente',
    priority TEXT DEFAULT 'Média',
    type TEXT DEFAULT 'task',
    due_date TIMESTAMP WITH TIME ZONE,
    lead_id UUID REFERENCES m4_leads(id) ON DELETE CASCADE,
    company_id UUID REFERENCES m4_companies(id),
    contact_id UUID REFERENCES m4_contacts(id),
    deal_id UUID REFERENCES m4_leads(id) ON DELETE CASCADE,
    client_account_id UUID,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_type TEXT,
    recurrence_days TEXT[],
    recurrence_day_of_month INTEGER,
    recurrence_month_week TEXT,
    recurrence_end_date DATE,
    recurrence_occurrences INTEGER,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2) DEFAULT 0,
    start_date DATE,
    depends_on_task_id UUID REFERENCES m4_tasks(id),
    parent_task_id UUID REFERENCES m4_tasks(id),
    task_type TEXT DEFAULT 'internal',
    interaction_success BOOLEAN DEFAULT TRUE,
    interaction_note TEXT,
    client_id UUID,
    list_id UUID,
    checklist JSONB DEFAULT '[]',
    dependencies JSONB DEFAULT '[]',
    tags TEXT,
    workspace_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m4_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES m4_tasks(id) ON DELETE CASCADE,
  user_id UUID,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m4_task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES m4_tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  storage_path TEXT NOT NULL,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Financeiro (Organizador Empresarial)
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
    workspace_id UUID NOT NULL,
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
    workspace_id UUID NOT NULL,
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
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    type fin_counterparty_type DEFAULT 'outro',
    document TEXT,
    email TEXT,
    phone TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    bank TEXT,
    type fin_bank_account_type DEFAULT 'checking',
    initial_balance NUMERIC DEFAULT 0,
    initial_balance_date DATE DEFAULT CURRENT_DATE,
    color TEXT,
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    currency TEXT DEFAULT 'BRL',
    current_balance NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
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
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.m4_fin_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    category_id UUID REFERENCES public.m4_fin_categories(id),
    dre_group TEXT,
    cost_center_id UUID REFERENCES public.m4_fin_cost_centers(id),
    period TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    scenario TEXT NOT NULL DEFAULT 'realistic',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Automações e Interações
CREATE TABLE IF NOT EXISTS m4_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL,
    trigger_config JSONB NOT NULL DEFAULT '{}',
    actions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    workspace_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m4_automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID REFERENCES m4_automations(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES m4_leads(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    message TEXT,
    workspace_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m4_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES m4_leads(id) ON DELETE CASCADE,
    type TEXT,
    note TEXT,
    success BOOLEAN DEFAULT TRUE,
    workspace_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m4_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_name TEXT,
    sender_email TEXT,
    recipient_email TEXT,
    subject TEXT,
    body TEXT,
    folder TEXT DEFAULT 'inbox',
    is_read BOOLEAN DEFAULT FALSE,
    company_id UUID REFERENCES m4_companies(id),
    lead_id UUID REFERENCES m4_leads(id) ON DELETE CASCADE,
    workspace_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Questionários (Forms)
CREATE TABLE IF NOT EXISTS m4_form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    questions JSONB NOT NULL DEFAULT '[]',
    workspace_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m4_form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES m4_form_templates(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES m4_leads(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. RLS e Políticas (Acesso Total para Autenticados)
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name LIKE 'm4_%'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all access" ON %I', t);
        EXECUTE format('CREATE POLICY "Allow all access" ON %I FOR ALL USING (true)', t);
    END LOOP;
END $$;
`;

  const updateSQL = `-- 🔄 SCRIPT DE ATUALIZAÇÃO SEGURA (Sem perda de dados)
-- Use este script para adicionar novas colunas e tabelas sem apagar nada.

DO $$ 
DECLARE
    t text;
BEGIN
    -- 1. Novas Tabelas (Interações, Serviços, Forms)
    CREATE TABLE IF NOT EXISTS public.m4_interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID REFERENCES public.m4_leads(id) ON DELETE CASCADE,
        type TEXT,
        note TEXT,
        success BOOLEAN DEFAULT true,
        workspace_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.m4_services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        default_price NUMERIC DEFAULT 0,
        workspace_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.m4_form_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        questions JSONB NOT NULL DEFAULT '[]',
        workspace_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.m4_form_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        form_id UUID REFERENCES public.m4_form_templates(id) ON DELETE CASCADE,
        lead_id UUID REFERENCES public.m4_leads(id) ON DELETE CASCADE,
        answers JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 2. Colunas Faltantes em Leads
    ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS origin_lead_id UUID;
    ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.m4_companies(id);
    ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.m4_contacts(id);
    ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS workspace_id UUID;
    ALTER TABLE public.m4_leads ALTER COLUMN stage SET DEFAULT 'new';

    -- 3. Colunas Faltantes em Tarefas (ClickUp Advanced)
    ALTER TABLE m4_tasks ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2);
    ALTER TABLE m4_tasks ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(5,2) DEFAULT 0;
    ALTER TABLE m4_tasks ADD COLUMN IF NOT EXISTS start_date DATE;
    ALTER TABLE m4_tasks ADD COLUMN IF NOT EXISTS depends_on_task_id UUID REFERENCES m4_tasks(id);
    ALTER TABLE m4_tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES m4_tasks(id);
    ALTER TABLE m4_tasks ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'internal';
    ALTER TABLE m4_tasks ADD COLUMN IF NOT EXISTS interaction_success BOOLEAN DEFAULT TRUE;
    ALTER TABLE m4_tasks ADD COLUMN IF NOT EXISTS interaction_note TEXT;
    ALTER TABLE m4_tasks ADD COLUMN IF NOT EXISTS client_id UUID;
    ALTER TABLE m4_tasks ADD COLUMN IF NOT EXISTS list_id UUID;
    ALTER TABLE m4_tasks ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]';
    ALTER TABLE m4_tasks ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]';
    ALTER TABLE m4_tasks ADD COLUMN IF NOT EXISTS tags TEXT;
    ALTER TABLE m4_tasks ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.m4_contacts(id);
    ALTER TABLE m4_tasks ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES m4_leads(id);

    -- 4. Correção de Constraints (Cascade Delete)
    ALTER TABLE m4_transactions DROP CONSTRAINT IF EXISTS m4_transactions_lead_id_fkey;
    ALTER TABLE m4_transactions ADD CONSTRAINT m4_transactions_lead_id_fkey 
        FOREIGN KEY (lead_id) REFERENCES m4_leads(id) ON DELETE CASCADE;

    ALTER TABLE m4_emails DROP CONSTRAINT IF EXISTS m4_emails_lead_id_fkey;
    ALTER TABLE m4_emails ADD CONSTRAINT m4_emails_lead_id_fkey 
        FOREIGN KEY (lead_id) REFERENCES m4_leads(id) ON DELETE CASCADE;

    ALTER TABLE m4_tasks DROP CONSTRAINT IF EXISTS m4_tasks_deal_id_fkey;
    ALTER TABLE m4_tasks ADD CONSTRAINT m4_tasks_deal_id_fkey 
        FOREIGN KEY (deal_id) REFERENCES m4_leads(id) ON DELETE CASCADE;

    -- 6. Organizador Financeiro Empresarial (Fundação)
    -- Enums
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

    -- Tabelas
    CREATE TABLE IF NOT EXISTS public.m4_fin_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL,
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
        workspace_id UUID NOT NULL,
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
        workspace_id UUID NOT NULL,
        name TEXT NOT NULL,
        type fin_counterparty_type DEFAULT 'outro',
        document TEXT,
        email TEXT,
        phone TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.m4_fin_bank_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL,
        name TEXT NOT NULL,
        bank TEXT,
        type fin_bank_account_type DEFAULT 'checking',
        initial_balance NUMERIC DEFAULT 0,
        initial_balance_date DATE DEFAULT CURRENT_DATE,
        color TEXT,
        icon TEXT,
        is_active BOOLEAN DEFAULT true,
        currency TEXT DEFAULT 'BRL',
        current_balance NUMERIC DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.m4_fin_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL,
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
        created_by UUID,
        updated_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.m4_fin_budgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL,
        category_id UUID REFERENCES public.m4_fin_categories(id),
        dre_group TEXT,
        cost_center_id UUID REFERENCES public.m4_fin_cost_centers(id),
        period TEXT NOT NULL,
        amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        scenario TEXT NOT NULL DEFAULT 'realistic',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.m4_fin_payment_methods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL,
        name TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Índices
    CREATE INDEX IF NOT EXISTS idx_fin_trans_workspace ON public.m4_fin_transactions(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_fin_trans_due_date ON public.m4_fin_transactions(due_date);
    CREATE INDEX IF NOT EXISTS idx_fin_trans_paid_at ON public.m4_fin_transactions(paid_at);
    CREATE INDEX IF NOT EXISTS idx_fin_trans_bank ON public.m4_fin_transactions(bank_account_id);
    CREATE INDEX IF NOT EXISTS idx_fin_trans_category ON public.m4_fin_transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_fin_cat_workspace ON public.m4_fin_categories(workspace_id);

    -- RLS
    ALTER TABLE public.m4_fin_categories ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.m4_fin_cost_centers ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.m4_fin_counterparties ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.m4_fin_bank_accounts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.m4_fin_transactions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.m4_fin_budgets ENABLE ROW LEVEL SECURITY;

    -- 7. Reset de Políticas RLS (Garantir Acesso Total)
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name LIKE 'm4_%'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all access" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Workspace isolation" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON %I', t);
        EXECUTE format('CREATE POLICY "Allow all access" ON %I FOR ALL USING (true)', t);
    END LOOP;
END $$;
`;

  const migrationSQL = `
-- MIGRAÇÃO DE DADOS: ANTIGO -> NOVO (M4_FIN)
DO $$
BEGIN
    -- 1. Categorias
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'm4_finance_categories') THEN
        INSERT INTO public.m4_fin_categories (id, workspace_id, name, type, impacts_dre, dre_group, created_at)
        SELECT id, workspace_id, name, 'both', true, 'Outras Receitas/Despesas', created_at
        FROM public.m4_finance_categories
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- 2. Métodos de Pagamento
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'm4_payment_methods') THEN
        INSERT INTO public.m4_fin_payment_methods (id, workspace_id, name, is_active, created_at)
        SELECT id, workspace_id, name, true, created_at
        FROM public.m4_payment_methods
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- 3. Contas Bancárias
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'm4_bank_accounts') THEN
        INSERT INTO public.m4_fin_bank_accounts (id, workspace_id, name, bank, type, initial_balance, current_balance, created_at)
        SELECT id, workspace_id, name, 'Banco Importado', 'checking', balance, balance, created_at
        FROM public.m4_bank_accounts
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- 4. Transações
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'm4_transactions') THEN
        INSERT INTO public.m4_fin_transactions (
            id, workspace_id, type, status, description, amount, 
            issue_date, due_date, paid_at, competence_date,
            bank_account_id, payment_method, notes, is_recurring, created_at
        )
        SELECT 
            id, workspace_id, 
            CASE WHEN type = 'Receita' THEN 'income'::fin_transaction_type ELSE 'expense'::fin_transaction_type END,
            CASE WHEN status IN ('Recebido', 'Pago') THEN 'paid'::fin_transaction_status ELSE 'pending'::fin_transaction_status END,
            description, amount,
            date::date, due_date::date, 
            CASE WHEN status IN ('Recebido', 'Pago') THEN date::timestamp with time zone ELSE NULL END,
            date::date,
            bank_account_id, payment_method, notes, is_recurring, created_at
        FROM public.m4_transactions
        ON CONFLICT (id) DO NOTHING;
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
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Painel Técnico SQL</h2>
          <p className="text-slate-500 font-medium italic">Gerencie a estrutura do seu banco de dados de forma simplificada.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Opção 1: Setup Completo */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">1. Instalação Geral</h3>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Setup Completo do Zero</p>
            </div>
            <button 
              onClick={() => handleCopy(fullSetupSQL, 'full')}
              className={`p-4 rounded-2xl transition-all ${copied === 'full' ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white'}`}
            >
              {copied === 'full' ? 'Copiado!' : 'Copiar SQL'}
            </button>
          </div>
          <div className="relative">
            <pre className="bg-slate-900 text-blue-300 p-8 rounded-[1.75rem] text-[10px] font-mono overflow-x-auto max-h-[300px] scrollbar-thin">
              {fullSetupSQL}
            </pre>
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-900 to-transparent rounded-b-[1.75rem]"></div>
          </div>
          <div className="mt-8 p-6 bg-red-50 rounded-2xl border border-red-100 flex gap-4">
             <div className="text-red-500"><ICONS.Plus className="rotate-45" /></div>
             <p className="text-[11px] font-bold text-red-700 leading-relaxed uppercase">Use este script apenas se estiver começando um banco novo. Ele cria todas as tabelas necessárias.</p>
          </div>
        </div>

        {/* Opção 2: Atualização Segura */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-xl transition-all group bg-blue-50/10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-black text-blue-900 dark:text-blue-400 uppercase tracking-tight">2. Atualização Segura</h3>
              <p className="text-xs font-bold text-blue-400 mt-1 uppercase tracking-widest">Sem apagar dados</p>
            </div>
            <button 
              onClick={() => handleCopy(updateSQL, 'update')}
              className={`p-4 rounded-2xl transition-all ${copied === 'update' ? 'bg-emerald-500 text-white' : 'bg-blue-50 text-blue-400 hover:bg-blue-600 hover:text-white'}`}
            >
              {copied === 'update' ? 'Copiado!' : 'Copiar SQL'}
            </button>
          </div>
          <div className="relative">
            <pre className="bg-slate-900 text-indigo-300 p-8 rounded-[1.75rem] text-[10px] font-mono overflow-x-auto max-h-[300px] scrollbar-thin">
              {updateSQL}
            </pre>
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-900 to-transparent rounded-b-[1.75rem]"></div>
          </div>
          <div className="mt-8 p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-4">
             <div className="text-emerald-500"><ICONS.Automation /></div>
             <p className="text-[11px] font-bold text-emerald-700 leading-relaxed uppercase">Use este script para atualizar um banco existente. Ele adiciona novas colunas e tabelas sem afetar seus dados.</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-12 rounded-[3.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="flex-1 space-y-4">
          <h4 className="text-2xl font-black uppercase tracking-tight">Migração de Dados</h4>
          <p className="text-slate-400 font-medium text-sm">Use este script para migrar dados das tabelas antigas para a nova estrutura financeira (m4_fin).</p>
          <button 
            onClick={() => handleCopy(migrationSQL, 'migration')}
            className={`px-8 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${copied === 'migration' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {copied === 'migration' ? 'Copiado!' : 'Copiar SQL de Migração'}
          </button>
        </div>
        <div className="w-48 h-48 bg-blue-600/20 rounded-[2.5rem] border border-blue-500/30 flex items-center justify-center">
           <ICONS.Database size={48} className="text-blue-400" />
        </div>
      </div>

      <div className="bg-slate-900 p-12 rounded-[3.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="flex-1 space-y-4">
          <h4 className="text-2xl font-black uppercase tracking-tight">Como Aplicar?</h4>
          <ol className="space-y-3 text-slate-400 font-medium text-sm list-decimal ml-5">
            <li>Acesse o dashboard do seu projeto no <a href="https://supabase.com" target="_blank" className="text-blue-400 hover:underline">Supabase</a>.</li>
            <li>No menu lateral esquerdo, clique em <span className="text-white font-bold">"SQL Editor"</span>.</li>
            <li>Clique em <span className="text-white font-bold">"+ New Query"</span>.</li>
            <li>Cole o código copiado aqui e clique em <span className="text-blue-500 font-black italic">"RUN"</span>.</li>
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
            <h3 className="text-xl font-black text-rose-900 dark:text-rose-400 uppercase tracking-tight">Zona de Perigo</h3>
            <p className="text-sm font-bold text-rose-600 dark:text-rose-500 uppercase tracking-widest mt-1">Ações irreversíveis de configuração</p>
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
