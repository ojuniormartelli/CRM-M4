-- 🚀 Ensure All Essential Tables Exist (M4 CRM)
-- This script ensures all tables used by the application are present.

DO $$ 
BEGIN
    -- 1. Automations
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'm4_automations') THEN
        CREATE TABLE public.m4_automations (
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
    END IF;

    -- 2. Automation Logs
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'm4_automation_logs') THEN
        CREATE TABLE public.m4_automation_logs (
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
    END IF;

    -- 3. Client Accounts (Billing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'm4_client_accounts') THEN
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
    END IF;

    -- 4. Budget History (Finance Enhancement)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'm4_fin_budget_history') THEN
        CREATE TABLE public.m4_fin_budget_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
            budget_id UUID REFERENCES public.m4_fin_budgets(id) ON DELETE CASCADE,
            period TEXT NOT NULL,
            amount_planned DECIMAL(15,2) NOT NULL,
            amount_actual DECIMAL(15,2) DEFAULT 0,
            variation DECIMAL(15,2),
            created_at TIMESTAMPTZ DEFAULT now()
        );
    END IF;
END $$;

-- Enable RLS for all newly confirmed tables
ALTER TABLE IF EXISTS m4_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS m4_automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS m4_client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS m4_fin_budget_history ENABLE ROW LEVEL SECURITY;

-- Apply permissive policies
DROP POLICY IF EXISTS "Allow all access" ON m4_automations;
CREATE POLICY "Allow all access" ON m4_automations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON m4_automation_logs;
CREATE POLICY "Allow all access" ON m4_automation_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON m4_client_accounts;
CREATE POLICY "Allow all access" ON m4_client_accounts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON m4_fin_budget_history;
CREATE POLICY "Allow all access" ON m4_fin_budget_history FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
