-- Migration Etapa 5: Orçamento e KPIs

CREATE TABLE IF NOT EXISTS m4_fin_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    category_id UUID REFERENCES m4_fin_categories(id),
    dre_group TEXT,
    cost_center_id UUID REFERENCES m4_fin_cost_centers(id),
    period TEXT NOT NULL, -- Format: YYYY-MM
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    scenario TEXT NOT NULL DEFAULT 'realistic', -- optimistic, realistic, pessimistic
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE m4_fin_budgets ENABLE ROW LEVEL SECURITY;

-- Note: Assuming m4_workspaces_users is the table for multi-tenant access control
CREATE POLICY "Users can view budgets of their workspace"
    ON m4_fin_budgets FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM m4_workspaces_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert budgets in their workspace"
    ON m4_fin_budgets FOR INSERT
    WITH CHECK (workspace_id IN (SELECT workspace_id FROM m4_workspaces_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update budgets in their workspace"
    ON m4_fin_budgets FOR UPDATE
    USING (workspace_id IN (SELECT workspace_id FROM m4_workspaces_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete budgets in their workspace"
    ON m4_fin_budgets FOR DELETE
    USING (workspace_id IN (SELECT workspace_id FROM m4_workspaces_users WHERE user_id = auth.uid()));

-- Indices
CREATE INDEX idx_fin_budgets_workspace ON m4_fin_budgets(workspace_id);
CREATE INDEX idx_fin_budgets_period ON m4_fin_budgets(period);
CREATE INDEX idx_fin_budgets_scenario ON m4_fin_budgets(scenario);
