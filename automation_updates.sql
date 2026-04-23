
-- Add origin_lead_id to m4_leads
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS origin_lead_id UUID REFERENCES public.m4_leads(id);

-- Create automation logs table
CREATE TABLE IF NOT EXISTS public.m4_automation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    automation_id UUID NOT NULL REFERENCES public.m4_automations(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL,
    entity_type TEXT NOT NULL,
    action_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'success',
    error_message TEXT,
    execution_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for logs
ALTER TABLE public.m4_automation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view logs from their workspace" ON public.m4_automation_logs;
CREATE POLICY "Allow all access" ON public.m4_automation_logs FOR ALL USING (true) WITH CHECK (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_automation_logs_workspace ON public.m4_automation_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_automation ON public.m4_automation_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_entity ON public.m4_automation_logs(entity_id);
