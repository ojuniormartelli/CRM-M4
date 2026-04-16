
-- 🛡️ REFORÇO DE ARQUITETURA: WORKSPACES E WORKSPACE_USERS
-- Conforme solicitado pelo usuário para resolver o problema crítico de workspace_id

-- 1. Garante que as tabelas 'workspaces' e 'workspace_users' existam (sem prefixo m4, conforme solicitado)
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir o workspace real se ele não existir
INSERT INTO public.workspaces (id, name)
VALUES ('d8db3963-da46-4f32-92bb-f408540e33a3', 'M4 Marketing Digital')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.workspace_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Pode ser auth.uid() ou o ID interno do usuário
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, workspace_id)
);

-- 2. Atualizar a função de RLS para buscar nestas novas tabelas
CREATE OR REPLACE FUNCTION public.get_my_workspace_id()
RETURNS uuid AS $$
DECLARE
    ws_id uuid;
BEGIN
    -- 1. Tenta buscar no vínculo direto solicitado (workspace_users)
    -- Verificamos tanto por auth.uid() quanto se usuário estiver no m4_users e tivermos esse ID
    SELECT workspace_id INTO ws_id FROM public.workspace_users WHERE user_id = auth.uid() LIMIT 1;
    
    IF ws_id IS NOT NULL THEN
        RETURN ws_id;
    END IF;

    -- 2. Fallback para o m4_users.workspace_id (padrão anterior)
    SELECT workspace_id INTO ws_id FROM public.m4_users WHERE auth_user_id = auth.uid() LIMIT 1;
    
    RETURN ws_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Habilitar RLS nas novas tabelas
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspaces: select self" ON public.workspaces;
CREATE POLICY "Workspaces: select self" ON public.workspaces
FOR SELECT TO authenticated
USING (id = public.get_my_workspace_id());

DROP POLICY IF EXISTS "Workspace Users: select member" ON public.workspace_users;
CREATE POLICY "Workspace Users: select member" ON public.workspace_users
FOR SELECT TO authenticated
USING (user_id = auth.uid());
