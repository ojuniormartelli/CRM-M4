-- SQL Incremental para Módulo Financeiro (Recorrência)
-- Regras: Incremental, IF NOT EXISTS, sem alterar tipos, sem mexer em RLS/Policies.

DO $$ 
BEGIN
    -- Adicionar colunas de recorrência se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'm4_transactions' AND column_name = 'is_recurring') THEN
        ALTER TABLE m4_transactions ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'm4_transactions' AND column_name = 'recurrence_type') THEN
        ALTER TABLE m4_transactions ADD COLUMN recurrence_type TEXT; -- 'weekly', 'monthly', 'yearly'
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'm4_transactions' AND column_name = 'recurrence') THEN
        ALTER TABLE m4_transactions ADD COLUMN recurrence TEXT; -- 'fixed', 'variable'
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'm4_transactions' AND column_name = 'recurrence_interval') THEN
        ALTER TABLE m4_transactions ADD COLUMN recurrence_interval INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'm4_transactions' AND column_name = 'recurrence_end_date') THEN
        ALTER TABLE m4_transactions ADD COLUMN recurrence_end_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'm4_transactions' AND column_name = 'recurring_id') THEN
        ALTER TABLE m4_transactions ADD COLUMN recurring_id UUID;
    END IF;

    -- Índices para performance
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_m4_transactions_recurring_id' AND n.nspname = 'public') THEN
        CREATE INDEX idx_m4_transactions_recurring_id ON m4_transactions(recurring_id);
    END IF;

END $$;
