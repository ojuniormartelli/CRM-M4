-- 🔄 SCRIPT DE ATUALIZAÇÃO v4 (M4 CRM)
-- Adiciona tabelas faltantes e ajusta a posição das etapas do funil.

-- 1. Tabela de Interações (Histórico do Lead)
CREATE TABLE IF NOT EXISTS public.m4_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.m4_leads(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('WhatsApp', 'Ligação', 'E-mail', 'Reunião', 'Outro', 'ai_insight', 'Call', 'Email', 'Meeting', 'Note')),
    note TEXT,
    success BOOLEAN DEFAULT true,
    workspace_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Serviços
CREATE TABLE IF NOT EXISTS public.m4_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    default_price NUMERIC DEFAULT 0,
    workspace_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabelas de Questionários (Forms)
CREATE TABLE IF NOT EXISTS public.m4_form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    questions JSONB NOT NULL DEFAULT '[]',
    workspace_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.m4_form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES public.m4_form_templates(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.m4_leads(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Ajustar posições das etapas para garantir "Novo Lead" no topo (posição 1)
-- Nota: Isso assume que você está usando o pipeline padrão.
UPDATE public.m4_pipeline_stages SET position = 1 WHERE name = 'Novo Lead';
UPDATE public.m4_pipeline_stages SET position = 2 WHERE name = 'Qualificado';
UPDATE public.m4_pipeline_stages SET position = 3 WHERE name = 'Reunião Agendada';
UPDATE public.m4_pipeline_stages SET position = 4 WHERE name = 'Proposta Enviada';
UPDATE public.m4_pipeline_stages SET position = 5 WHERE name = 'Aguardando Decisão';
UPDATE public.m4_pipeline_stages SET position = 6 WHERE name = 'Fechado – Ganho';
UPDATE public.m4_pipeline_stages SET position = 7 WHERE name = 'Fechado – Perdido';

-- 5. Garantir que o stage padrão dos leads seja 'new' (Novo Lead)
ALTER TABLE public.m4_leads ALTER COLUMN stage SET DEFAULT 'new';
UPDATE public.m4_leads SET stage = 'new' WHERE stage = 's1' OR stage IS NULL;

-- 6. Habilitar RLS para as novas tabelas
ALTER TABLE m4_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_form_responses ENABLE ROW LEVEL SECURITY;

-- Políticas simplificadas (ajuste conforme necessário)
CREATE POLICY "Allow all for authenticated" ON m4_interactions FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON m4_services FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON m4_form_templates FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON m4_form_responses FOR ALL USING (true);
