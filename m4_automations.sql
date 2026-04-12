-- M4 CRM Automations Table
-- Foundation for trigger + conditions + actions system

CREATE TABLE IF NOT EXISTS m4_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID, -- Multi-workspace support (nullable for default state)
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- lead, task, client
    trigger_type TEXT NOT NULL, -- lead_created, status_change, etc.
    trigger_conditions JSONB DEFAULT '{}'::jsonb,
    actions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for workspace performance
CREATE INDEX IF NOT EXISTS idx_m4_automations_workspace_id ON m4_automations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_m4_automations_entity_type ON m4_automations(entity_type);

-- RLS (Row Level Security)
ALTER TABLE m4_automations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see/edit automations from their workspace
-- We allow access if workspace_id matches the user's workspace or if it's null (for default state)
CREATE POLICY "Users can manage automations in their workspace" 
ON m4_automations
FOR ALL
USING (
    workspace_id IS NULL OR 
    workspace_id::text IN (SELECT workspace_id::text FROM m4_users WHERE id::text = auth.uid()::text)
)
WITH CHECK (
    workspace_id IS NULL OR 
    workspace_id::text IN (SELECT workspace_id::text FROM m4_users WHERE id::text = auth.uid()::text)
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_m4_automations_updated_at
    BEFORE UPDATE ON m4_automations
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE m4_automations IS 'Stores automation rules for the CRM';
COMMENT ON COLUMN m4_automations.entity_type IS 'Target entity: lead, task, client';
COMMENT ON COLUMN m4_automations.trigger_type IS 'Event that triggers the automation';
COMMENT ON COLUMN m4_automations.trigger_conditions IS 'JSON configuration for trigger filters';
COMMENT ON COLUMN m4_automations.actions IS 'List of actions to execute when triggered';
