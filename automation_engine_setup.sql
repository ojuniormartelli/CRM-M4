
-- 🚀 SETUP COMPLETO DO MOTOR DE AUTOMAÇÕES (M4 CRM)
-- Este script garante que todas as tabelas e colunas necessárias existam para o funcionamento das automações.

DO $$ 
BEGIN
    -- 1. Garantir que a tabela de automações tenha a estrutura correta
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'm4_automations') THEN
        CREATE TABLE public.m4_automations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id UUID NOT NULL,
            name TEXT NOT NULL,
            entity_type TEXT NOT NULL, -- lead, task, client
            trigger_type TEXT NOT NULL, -- lead_created, status_change, stage_change, etc.
            trigger_conditions JSONB DEFAULT '[]'::jsonb,
            actions JSONB DEFAULT '[]'::jsonb,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
    END IF;

    -- 2. Adicionar coluna de controle de execução (prevenção de loops e auditoria)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'm4_automations' AND column_name = 'last_triggered_at') THEN
        ALTER TABLE public.m4_automations ADD COLUMN last_triggered_at TIMESTAMPTZ;
    END IF;

    -- 3. Garantir que m4_leads tenha o campo de origem para rastreamento de duplicações
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'm4_leads' AND column_name = 'origin_lead_id') THEN
        ALTER TABLE public.m4_leads ADD COLUMN origin_lead_id UUID REFERENCES public.m4_leads(id) ON DELETE SET NULL;
    END IF;

    -- 4. Criar tabela de Logs de Automação (Essencial para Debug)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'm4_automation_logs') THEN
        CREATE TABLE public.m4_automation_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id UUID NOT NULL,
            automation_id UUID REFERENCES public.m4_automations(id) ON DELETE CASCADE,
            entity_id UUID NOT NULL,
            entity_type TEXT NOT NULL,
            action_type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'success', -- success, error
            error_message TEXT,
            execution_details JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT now()
        );
    END IF;
END $$;

-- 5. Habilitar RLS e criar políticas básicas
ALTER TABLE public.m4_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.m4_automation_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de isolamento por workspace (simplificadas para o ambiente de preview)
DROP POLICY IF EXISTS "Workspace Isolation Automations" ON m4_automations;
CREATE POLICY "Workspace Isolation Automations" ON m4_automations FOR ALL USING (true);

DROP POLICY IF EXISTS "Workspace Isolation Logs" ON m4_automation_logs;
CREATE POLICY "Workspace Isolation Logs" ON m4_automation_logs FOR ALL USING (true);

-- 6. Índices para performance de busca de gatilhos
CREATE INDEX IF NOT EXISTS idx_automations_trigger_active ON m4_automations(trigger_type, is_active);
CREATE INDEX IF NOT EXISTS idx_automation_logs_entity ON m4_automation_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created ON m4_automation_logs(created_at DESC);

-- 7. Comentários para documentação
COMMENT ON TABLE m4_automations IS 'Regras de automação do CRM';
COMMENT ON TABLE m4_automation_logs IS 'Histórico de execução das automações';
