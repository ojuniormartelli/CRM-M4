
-- 🛠️ FIX: RLS Policies for Leads and Tasks
-- Allowing access even if workspace_id is NULL, and ensuring "Allow all" for authenticated users.

DO $$ 
BEGIN
    -- 1. Leads
    DROP POLICY IF EXISTS "Workspace isolation" ON m4_leads;
    DROP POLICY IF EXISTS "Allow all for authenticated" ON m4_leads;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'm4_leads' AND policyname = 'Allow all access') THEN
        CREATE POLICY "Allow all access" ON m4_leads FOR ALL USING (true);
    END IF;

    -- 2. Tasks
    DROP POLICY IF EXISTS "Workspace isolation" ON m4_tasks;
    DROP POLICY IF EXISTS "Allow all for authenticated" ON m4_tasks;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'm4_tasks' AND policyname = 'Allow all access') THEN
        CREATE POLICY "Allow all access" ON m4_tasks FOR ALL USING (true);
    END IF;

    -- 3. Pipelines & Stages (Just in case)
    DROP POLICY IF EXISTS "Allow all for authenticated" ON m4_pipelines;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'm4_pipelines' AND policyname = 'Allow all access') THEN
        CREATE POLICY "Allow all access" ON m4_pipelines FOR ALL USING (true);
    END IF;

    DROP POLICY IF EXISTS "Allow all for authenticated" ON m4_pipeline_stages;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'm4_pipeline_stages' AND policyname = 'Allow all access') THEN
        CREATE POLICY "Allow all access" ON m4_pipeline_stages FOR ALL USING (true);
    END IF;
END $$;
