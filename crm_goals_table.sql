
-- 🎯 TABELA DE METAS (M4 CRM)
CREATE TABLE IF NOT EXISTS public.m4_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- Primeiro dia do mês
  revenue_goal NUMERIC DEFAULT 0,
  leads_goal INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, month)
);

-- Habilitar RLS
ALTER TABLE m4_goals ENABLE ROW LEVEL SECURITY;

-- Política de isolamento por workspace
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'm4_goals' AND policyname = 'Allow all for authenticated') THEN
    CREATE POLICY "Allow all for authenticated" ON m4_goals FOR ALL USING (true);
  END IF;
END $$;
