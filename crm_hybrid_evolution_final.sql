-- 🚀 CRM + Task Management Evolution (ClickUp Style)
-- Script de migração incremental para transformar o CRM em uma ferramenta híbrida.

-- 1. Tabela de Clientes (Evolução de m4_client_accounts)
CREATE TABLE IF NOT EXISTS public.m4_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.m4_leads(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.m4_companies(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- active | paused | churned
  contract_start_date DATE,
  monthly_value NUMERIC DEFAULT 0,
  services JSONB DEFAULT '[]', -- ['trafego', 'social', 'web']
  manager_id UUID, -- Referência ao responsável
  workspace_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Expandir m4_tasks
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.m4_clients(id) ON DELETE CASCADE;
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'operational'; -- 'commercial' | 'operational' | 'internal'
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'none'; -- 'none' | 'daily' | 'weekly' | 'monthly'
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB DEFAULT '{}';
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.m4_tasks(id) ON DELETE CASCADE;
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'; -- [{item: 'texto', checked: false}]
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'; -- [task_id_1, task_id_2]
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC DEFAULT 0;
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS actual_hours NUMERIC DEFAULT 0;
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS list_id UUID; -- Será referenciado após criar m4_lists

-- 3. Tabela de Templates de Tarefas
CREATE TABLE IF NOT EXISTS public.m4_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL, -- 'lead_won' | 'client_onboarding' | 'monthly_routine'
  tasks JSONB NOT NULL DEFAULT '[]', -- [{title, description, due_days, assignee}]
  workspace_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Workspaces, Pastas e Listas (Organização Hierárquica)
CREATE TABLE IF NOT EXISTS public.m4_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- 'Comercial' | 'Operação' | 'Administrativo'
  icon TEXT,
  color TEXT,
  workspace_id UUID, -- ID do workspace do Supabase (isolamento)
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

-- Adicionar FK em m4_tasks para m4_lists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_list') THEN
    ALTER TABLE public.m4_tasks ADD CONSTRAINT fk_task_list FOREIGN KEY (list_id) REFERENCES public.m4_lists(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Campos Personalizados
CREATE TABLE IF NOT EXISTS public.m4_custom_fields_def (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'lead' | 'client' | 'task'
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL, -- 'text' | 'number' | 'date' | 'select' | 'multiselect'
  options JSONB DEFAULT '[]',
  workspace_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.m4_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_field_id UUID REFERENCES public.m4_custom_fields_def(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  value JSONB,
  workspace_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Automações
CREATE TABLE IF NOT EXISTS public.m4_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- 'status_change' | 'date_trigger' | 'field_update'
  trigger_conditions JSONB DEFAULT '{}',
  actions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  workspace_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Time Tracking
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

-- 8. Habilitar RLS
ALTER TABLE m4_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_custom_fields_def ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_time_tracking ENABLE ROW LEVEL SECURITY;

-- Políticas (Simplificadas para o dev)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for authenticated' AND tablename = 'm4_clients') THEN
    CREATE POLICY "Allow all for authenticated" ON m4_clients FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for authenticated' AND tablename = 'm4_task_templates') THEN
    CREATE POLICY "Allow all for authenticated" ON m4_task_templates FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for authenticated' AND tablename = 'm4_workspaces') THEN
    CREATE POLICY "Allow all for authenticated" ON m4_workspaces FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for authenticated' AND tablename = 'm4_folders') THEN
    CREATE POLICY "Allow all for authenticated" ON m4_folders FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for authenticated' AND tablename = 'm4_lists') THEN
    CREATE POLICY "Allow all for authenticated" ON m4_lists FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for authenticated' AND tablename = 'm4_custom_fields_def') THEN
    CREATE POLICY "Allow all for authenticated" ON m4_custom_fields_def FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for authenticated' AND tablename = 'm4_custom_field_values') THEN
    CREATE POLICY "Allow all for authenticated" ON m4_custom_field_values FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for authenticated' AND tablename = 'm4_automations') THEN
    CREATE POLICY "Allow all for authenticated" ON m4_automations FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for authenticated' AND tablename = 'm4_time_tracking') THEN
    CREATE POLICY "Allow all for authenticated" ON m4_time_tracking FOR ALL USING (true);
  END IF;
END $$;
