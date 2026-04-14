-- 🏦 MÓDULO: ORGANIZADOR FINANCEIRO EMPRESARIAL
-- Etapa 1: Fundação de Dados e Estrutura do Domínio

-- 1. ENUMS (Tipos e Status)
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

-- 2. TABELAS DE APOIO (Categorias, Centros de Custo, Contrapartes)

-- Categorias Financeiras (Hierárquicas)
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
    dre_group TEXT, -- receita_bruta, deducoes, custos, despesas_operacionais, etc.
    classification_type fin_classification_type DEFAULT 'operacional',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Centros de Custo
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

-- Contrapartes / Favorecidos
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

-- 3. CONTAS BANCÁRIAS (Evolução da m4_bank_accounts)
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

-- 4. LANÇAMENTOS FINANCEIROS (Robustos)
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
    destination_bank_account_id UUID REFERENCES public.m4_fin_bank_accounts(id), -- Para transferências
    counterparty_id UUID REFERENCES public.m4_fin_counterparties(id),
    category_id UUID REFERENCES public.m4_fin_categories(id),
    cost_center_id UUID REFERENCES public.m4_fin_cost_centers(id),
    
    payment_method TEXT,
    reference_code TEXT,
    notes TEXT,
    attachment_url TEXT,
    
    -- Recorrência
    is_recurring BOOLEAN DEFAULT false,
    recurrence_group_id UUID,
    recurrence_frequency TEXT, -- weekly, monthly, yearly
    recurrence_interval INTEGER DEFAULT 1,
    recurrence_end_date DATE,
    parent_transaction_id UUID REFERENCES public.m4_fin_transactions(id),
    generation_mode TEXT DEFAULT 'manual', -- manual, automatic
    
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_fin_trans_workspace ON public.m4_fin_transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fin_trans_due_date ON public.m4_fin_transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_fin_trans_paid_at ON public.m4_fin_transactions(paid_at);
CREATE INDEX IF NOT EXISTS idx_fin_trans_bank ON public.m4_fin_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_fin_trans_category ON public.m4_fin_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_fin_cat_workspace ON public.m4_fin_categories(workspace_id);

-- 6. POLICIES RLS (Isolamento por Workspace)
ALTER TABLE public.m4_fin_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.m4_fin_cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.m4_fin_counterparties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.m4_fin_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.m4_fin_transactions ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name LIKE 'm4_fin_%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Workspace isolation" ON %I', t);
        EXECUTE format('CREATE POLICY "Workspace isolation" ON %I FOR ALL USING (workspace_id = (SELECT workspace_id FROM m4_users WHERE auth_user_id = auth.uid() LIMIT 1))', t);
    END LOOP;
END $$;

-- 7. SEEDS INICIAIS (Categorias Padrão DRE)
-- Nota: O workspace_id deve ser preenchido conforme o tenant. 
-- Abaixo um exemplo de estrutura que pode ser inserida via App ou script de migração.
-- INSERT INTO public.m4_fin_categories (workspace_id, name, type, dre_group, impacts_dre) VALUES 
-- ('UUID_AQUI', 'Receita de Vendas', 'income', 'receita_bruta', true),
-- ('UUID_AQUI', 'Impostos sobre Vendas', 'expense', 'deducoes', true),
-- ('UUID_AQUI', 'Custo de Mercadorias', 'expense', 'custos', true),
-- ('UUID_AQUI', 'Salários e Encargos', 'expense', 'despesas_operacionais', true),
-- ('UUID_AQUI', 'Aluguel e Condomínio', 'expense', 'despesas_operacionais', true),
-- ('UUID_AQUI', 'Marketing e Publicidade', 'expense', 'despesas_operacionais', true),
-- ('UUID_AQUI', 'Receitas Financeiras', 'income', 'resultado_financeiro', true),
-- ('UUID_AQUI', 'Despesas Financeiras', 'expense', 'resultado_financeiro', true);
