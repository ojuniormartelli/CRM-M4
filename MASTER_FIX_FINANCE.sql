-- =========================================================
-- 🛠️ SCRIPT DE CONSOLIDAÇÃO FINANCEIRA FINAL (M4 CRM)
-- Corrige tabelas ausentes, relacionamentos e padroniza campos.
-- =========================================================

DO $$ 
BEGIN
    -- 1. ENUMS (Garantir que todos existem)
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
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Note: Enums already exist or error occurred: %', SQLERRM;
END $$;

-- 2. TABELAS DE APOIO

-- Categorias
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

-- Centros de Custo (Corrigindo erro de tabela não encontrada)
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

-- Contrapartes (Standard: WhatsApp)
CREATE TABLE IF NOT EXISTS public.m4_fin_counterparties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    type fin_counterparty_type DEFAULT 'outro',
    document TEXT,
    email TEXT,
    whatsapp TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrar phone -> whatsapp em counterparties se necessário
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_fin_counterparties' AND column_name='phone') THEN
        UPDATE public.m4_fin_counterparties SET whatsapp = phone WHERE whatsapp IS NULL;
        ALTER TABLE public.m4_fin_counterparties DROP COLUMN phone;
    END IF;
END $$;

-- Métodos de Pagamento (Corrigindo erro de tabela não encontrada)
CREATE TABLE IF NOT EXISTS public.m4_fin_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CONTAS BANCÁRIAS
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

-- Garantir coluna current_balance (compatibilidade balance)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_fin_bank_accounts' AND column_name='balance') THEN
        ALTER TABLE public.m4_fin_bank_accounts ADD COLUMN balance NUMERIC DEFAULT 0;
    END IF;
END $$;

-- 4. LANÇAMENTOS FINANCEIROS
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

-- FORÇAR E GARANTIR O RELACIONAMENTO (Fix para erro de cross-resource query)
-- Isso garante que PostgREST veja o relacionamento
DO $$ 
BEGIN
    -- counterparty_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'm4_fin_transactions_counterparty_id_fkey') THEN
        ALTER TABLE public.m4_fin_transactions 
        ADD CONSTRAINT m4_fin_transactions_counterparty_id_fkey 
        FOREIGN KEY (counterparty_id) REFERENCES public.m4_fin_counterparties(id) ON DELETE SET NULL;
    END IF;

    -- category_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'm4_fin_transactions_category_id_fkey') THEN
        ALTER TABLE public.m4_fin_transactions 
        ADD CONSTRAINT m4_fin_transactions_category_id_fkey 
        FOREIGN KEY (category_id) REFERENCES public.m4_fin_categories(id) ON DELETE SET NULL;
    END IF;

    -- cost_center_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'm4_fin_transactions_cost_center_id_fkey') THEN
        ALTER TABLE public.m4_fin_transactions 
        ADD CONSTRAINT m4_fin_transactions_cost_center_id_fkey 
        FOREIGN KEY (cost_center_id) REFERENCES public.m4_fin_cost_centers(id) ON DELETE SET NULL;
    END IF;

    -- bank_account_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'm4_fin_transactions_bank_account_id_fkey') THEN
        ALTER TABLE public.m4_fin_transactions 
        ADD CONSTRAINT m4_fin_transactions_bank_account_id_fkey 
        FOREIGN KEY (bank_account_id) REFERENCES public.m4_fin_bank_accounts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. RLS E POLÍTICAS
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
        EXECUTE format('DROP POLICY IF EXISTS "Workspace isolation" ON %I', t);
        EXECUTE format('CREATE POLICY "Allow all access" ON %I FOR ALL USING (true)', t);
    END LOOP;
END $$;

-- 6. RECARGA DE SCHEMA (Opcional, mas ajuda no Supabase)
NOTIFY pgrst, 'reload schema';
