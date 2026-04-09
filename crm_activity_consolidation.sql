-- Consolidação da arquitetura de atividades
-- Adicionando campos de interação na tabela de tarefas para permitir unificação

ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS interaction_success BOOLEAN DEFAULT TRUE;
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS interaction_note TEXT; -- Caso queira separar nota de interação da descrição da tarefa

-- Garantir que task_type tenha um valor padrão sensato
UPDATE public.m4_tasks SET task_type = 'internal' WHERE task_type IS NULL;
ALTER TABLE public.m4_tasks ALTER COLUMN task_type SET DEFAULT 'internal';

-- Comentário para documentação
COMMENT ON COLUMN public.m4_tasks.interaction_success IS 'Indica se uma interação comercial (ligação, reunião) teve sucesso';
COMMENT ON COLUMN public.m4_tasks.task_type IS 'Domínio da tarefa: commercial (leads), operational (clientes), internal (equipe)';
