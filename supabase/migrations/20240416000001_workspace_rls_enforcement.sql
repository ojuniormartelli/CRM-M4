
-- 🛡️ REFORÇO DE SEGURANÇA: ISOLAMENTO TOTAL POR WORKSPACE_ID

-- 1. Função auxiliar para obter o workspace_id do usuário logado
CREATE OR REPLACE FUNCTION public.get_my_workspace_id()
RETURNS uuid AS $$
  SELECT workspace_id FROM public.m4_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Habilitar RLS e criar políticas automáticas para tabelas com workspace_id
DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN (
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'm4_%' 
        AND column_name = 'workspace_id'
        AND table_name != 'm4_users' -- m4_users terá política especial
    ) LOOP
        -- Habilitar RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        
        -- Remover políticas antigas
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Isolamento por workspace" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Workspace isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Leads: isolamento por workspace" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Companies: isolamento por workspace" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Contacts: isolamento por workspace" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Tasks: isolamento por workspace" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Transactions: isolamento por workspace" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Bank Accounts: isolamento por workspace" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Client Accounts: isolamento por workspace" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Settings: isolamento por workspace" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Pipelines: isolamento por workspace" ON public.%I', t);
        
        -- Criar nova política estrita
        EXECUTE format('CREATE POLICY "Isolamento por workspace" ON public.%I FOR ALL TO authenticated USING (workspace_id = public.get_my_workspace_id()) WITH CHECK (workspace_id = public.get_my_workspace_id())', t);
    END LOOP;
END $$;

-- 3. Políticas Especiais para tabelas sem workspace_id ou com lógica diferenciada

-- Tabela: m4_users
ALTER TABLE public.m4_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users: isolamento por workspace" ON public.m4_users;
DROP POLICY IF EXISTS "Users: update self" ON public.m4_users;
DROP POLICY IF EXISTS "Users: select workspace" ON public.m4_users;

-- Ver apenas usuários do mesmo workspace
CREATE POLICY "Users: select workspace" ON public.m4_users
FOR SELECT TO authenticated
USING (workspace_id = public.get_my_workspace_id());

-- Atualizar apenas o próprio perfil
CREATE POLICY "Users: update self" ON public.m4_users
FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Tabela: m4_pipeline_stages (Vinculado ao pipeline que pertence ao workspace)
ALTER TABLE public.m4_pipeline_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stages: isolamento por workspace" ON public.m4_pipeline_stages;
CREATE POLICY "Stages: isolamento por workspace" ON public.m4_pipeline_stages
FOR ALL TO authenticated
USING (
    pipeline_id IN (SELECT id FROM public.m4_pipelines WHERE workspace_id = public.get_my_workspace_id())
)
WITH CHECK (
    pipeline_id IN (SELECT id FROM public.m4_pipelines WHERE workspace_id = public.get_my_workspace_id())
);

-- Tabela: m4_workspaces (Usuário pode ver apenas o seu workspace)
ALTER TABLE public.m4_workspaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspaces: select self" ON public.m4_workspaces;
CREATE POLICY "Workspaces: select self" ON public.m4_workspaces
FOR SELECT TO authenticated
USING (id = public.get_my_workspace_id());
