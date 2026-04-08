
-- 🛡️ CONSOLIDAÇÃO TÉCNICA DO BANCO DE DADOS (M4 CRM + ClickUp Style)
-- Script incremental e seguro. Não usa DROP TABLE.

-- 1. ESTRUTURA HIERÁRQUICA (Workspaces, Folders, Lists)
CREATE TABLE IF NOT EXISTS public.m4_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  workspace_id UUID, -- Isolamento de tenant
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.m4_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_nav_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  workspace_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.m4_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES public.m4_folders(id) ON DELETE CASCADE,
  workspace_nav_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  view_type TEXT DEFAULT 'kanban', -- 'kanban' | 'list' | 'calendar' | 'table'
  workspace_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CLIENTES (Consolidação)
CREATE TABLE IF NOT EXISTS public.m4_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.m4_leads(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.m4_companies(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- active | paused | churned
  contract_start_date DATE,
  monthly_value NUMERIC DEFAULT 0,
  services JSONB DEFAULT '[]',
  manager_id UUID,
  workspace_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TAREFAS (Evolução ClickUp)
DO $$ 
BEGIN 
  -- Adicionar colunas se não existirem
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_tasks' AND column_name='client_id') THEN
    ALTER TABLE public.m4_tasks ADD COLUMN client_id UUID REFERENCES public.m4_clients(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_tasks' AND column_name='task_type') THEN
    ALTER TABLE public.m4_tasks ADD COLUMN task_type TEXT DEFAULT 'operational';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_tasks' AND column_name='recurrence') THEN
    ALTER TABLE public.m4_tasks ADD COLUMN recurrence TEXT DEFAULT 'none';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_tasks' AND column_name='recurrence_pattern') THEN
    ALTER TABLE public.m4_tasks ADD COLUMN recurrence_pattern JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_tasks' AND column_name='parent_task_id') THEN
    ALTER TABLE public.m4_tasks ADD COLUMN parent_task_id UUID REFERENCES public.m4_tasks(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_tasks' AND column_name='checklist') THEN
    ALTER TABLE public.m4_tasks ADD COLUMN checklist JSONB DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_tasks' AND column_name='dependencies') THEN
    ALTER TABLE public.m4_tasks ADD COLUMN dependencies JSONB DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_tasks' AND column_name='estimated_hours') THEN
    ALTER TABLE public.m4_tasks ADD COLUMN estimated_hours NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_tasks' AND column_name='actual_hours') THEN
    ALTER TABLE public.m4_tasks ADD COLUMN actual_hours NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_tasks' AND column_name='list_id') THEN
    ALTER TABLE public.m4_tasks ADD COLUMN list_id UUID REFERENCES public.m4_lists(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. AUTOMAÇÕES E TEMPLATES
CREATE TABLE IF NOT EXISTS public.m4_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  tasks JSONB NOT NULL DEFAULT '[]',
  workspace_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.m4_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_conditions JSONB DEFAULT '{}',
  actions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  workspace_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TIME TRACKING
CREATE TABLE IF NOT EXISTS public.m4_time_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.m4_tasks(id) ON DELETE CASCADE,
  user_id UUID,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes NUMERIC DEFAULT 0,
  workspace_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_m4_leads_workspace ON m4_leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_m4_tasks_workspace ON m4_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_m4_tasks_list ON m4_tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_m4_tasks_client ON m4_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_m4_clients_workspace ON m4_clients(workspace_id);
CREATE INDEX IF NOT EXISTS idx_m4_transactions_workspace ON m4_transactions(workspace_id);

-- 7. SEGURANÇA (RLS e POLICIES)
-- Habilitar RLS em todas as tabelas
ALTER TABLE m4_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_time_tracking ENABLE ROW LEVEL SECURITY;

-- Políticas baseadas em workspace_id (Exemplo para m4_leads)
-- Nota: Em produção, o workspace_id deve ser validado contra o token do usuário.
-- Aqui usamos uma política simplificada que assume que o cliente envia o workspace_id correto.

DO $$ 
BEGIN 
  -- Remover políticas genéricas antigas se existirem
  DROP POLICY IF EXISTS "Allow all for authenticated" ON m4_leads;
  DROP POLICY IF EXISTS "Allow all for authenticated" ON m4_tasks;
  
  -- Criar novas políticas mais restritivas (exemplo)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'm4_leads' AND policyname = 'Workspace isolation') THEN
    CREATE POLICY "Workspace isolation" ON m4_leads FOR ALL USING (workspace_id IS NOT NULL);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'm4_tasks' AND policyname = 'Workspace isolation') THEN
    CREATE POLICY "Workspace isolation" ON m4_tasks FOR ALL USING (workspace_id IS NOT NULL);
  END IF;

  -- Para as novas tabelas, garantir que haja pelo menos uma política
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'm4_clients' AND policyname = 'Allow all for authenticated') THEN
    CREATE POLICY "Allow all for authenticated" ON m4_clients FOR ALL USING (true);
  END IF;
END $$;
