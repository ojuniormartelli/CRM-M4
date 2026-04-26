-- 🚀 SCRIPT DE SEED DE DADOS DE TESTE ENRIQUECIDO (M4 CRM)
-- Este script insere dados de exemplo realistas para demonstração completa das funcionalidades.

-- Garantir coluna company_id em m4_tasks (Migração rápida)
ALTER TABLE IF EXISTS m4_tasks ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.m4_companies(id) ON DELETE SET NULL;

DO $$ 
DECLARE
    v_workspace_id UUID := 'fb786658-1234-4321-8888-999988887777'; -- Workspace Principal
    v_admin_id UUID;
    v_pipeline_vendas_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_stage_lead_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    v_stage_contact_id UUID;
    v_stage_proposal_id UUID;
    v_stage_negotiation_id UUID;
    v_company_tech_id UUID;
    v_company_food_id UUID;
    v_company_fashion_id UUID;
    v_cat_vendas_id UUID;
    v_cat_aluguel_id UUID;
    v_cat_salarios_id UUID;
    v_bank_pj_id UUID;
BEGIN
    -- 1. Verificar se o Workspace existe
    IF NOT EXISTS (SELECT 1 FROM m4_workspaces WHERE id = v_workspace_id) THEN
        INSERT INTO m4_workspaces (id, name) VALUES (v_workspace_id, 'Workspace Principal');
    END IF;

    -- 2. Garantir etapas extras do funil para dados realistas
    SELECT id INTO v_stage_contact_id FROM m4_pipeline_stages WHERE pipeline_id = v_pipeline_vendas_id AND name = 'Primeiro Contato' LIMIT 1;
    SELECT id INTO v_stage_proposal_id FROM m4_pipeline_stages WHERE pipeline_id = v_pipeline_vendas_id AND name = 'Proposta Enviada' LIMIT 1;
    SELECT id INTO v_stage_negotiation_id FROM m4_pipeline_stages WHERE pipeline_id = v_pipeline_vendas_id AND name = 'Negociação' LIMIT 1;

    -- 3. Garantir usuário admin
    SELECT id INTO v_admin_id FROM m4_users WHERE email = 'admin@m4.com' LIMIT 1;
    IF v_admin_id IS NULL THEN
        v_admin_id := gen_random_uuid();
        INSERT INTO m4_users (id, name, email, role, workspace_id, status)
        VALUES (v_admin_id, 'Administrador M4', 'admin@m4.com', 'owner', v_workspace_id, 'active');
    END IF;

    -- 4. Inserir Empresas de Exemplo com Nichos
    v_company_tech_id := gen_random_uuid();
    v_company_food_id := gen_random_uuid();
    v_company_fashion_id := gen_random_uuid();

    INSERT INTO m4_companies (id, name, niche, city, state, workspace_id)
    VALUES 
    (v_company_tech_id, 'Tech Soluções LTDA', 'Tecnologia SaaS', 'São Paulo', 'SP', v_workspace_id),
    (v_company_food_id, 'Alimentos Brasil S.A.', 'Indústria Alimentícia', 'Curitiba', 'PR', v_workspace_id),
    (v_company_fashion_id, 'Moda Fashion Brasil', 'Varejo / Moda', 'Rio de Janeiro', 'RJ', v_workspace_id)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_company_tech_id FROM m4_companies WHERE name = 'Tech Soluções LTDA' LIMIT 1;
    SELECT id INTO v_company_food_id FROM m4_companies WHERE name = 'Alimentos Brasil S.A.' LIMIT 1;
    SELECT id INTO v_company_fashion_id FROM m4_companies WHERE name = 'Moda Fashion Brasil' LIMIT 1;

    -- 5. Inserir Leads com Valores e Probabilidades Reais
    INSERT INTO m4_leads (contact_name, company_name, contact_email, value, status, pipeline_id, stage_id, workspace_id, company_id, responsible_id, probability, temperature, company_niche, source)
    VALUES 
    ('Consultoria Digital TECH', 'Tech Soluções LTDA', 'diretoria@tech.com', 45000.00, 'active', v_pipeline_vendas_id, v_stage_negotiation_id, v_workspace_id, v_company_tech_id, v_admin_id, 80, 'Quente', 'Tecnologia', 'Instagram'),
    ('Expansão E-commerce FASHION', 'Moda Fashion Brasil', 'marketing@moda.com', 28000.00, 'active', v_pipeline_vendas_id, v_stage_proposal_id, v_workspace_id, v_company_fashion_id, v_admin_id, 60, 'Morno', 'Varejo', 'Indicação'),
    ('Contrato Fechado SAAS', 'Tech Soluções LTDA', 'fechado@tech.com', 15000.00, 'won', v_pipeline_vendas_id, v_stage_lead_id, v_workspace_id, v_company_tech_id, v_admin_id, 100, 'Quente', 'Software', 'Google'),
    ('Lead Perdido Exemplo', 'Alimentos Brasil S.A.', 'perda@alimentos.com', 5000.00, 'lost', v_pipeline_vendas_id, v_stage_lead_id, v_workspace_id, v_company_food_id, v_admin_id, 0, 'Frio', 'Alimentos', 'Outros')
    ON CONFLICT DO NOTHING;

    -- 6. Categorias Financeiras
    INSERT INTO m4_fin_categories (id, name, type, workspace_id)
    VALUES 
    (gen_random_uuid(), 'Vendas de CRM', 'income', v_workspace_id),
    (gen_random_uuid(), 'Aluguel Escritório', 'expense', v_workspace_id),
    (gen_random_uuid(), 'Folha de Pagamento', 'expense', v_workspace_id)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_cat_vendas_id FROM m4_fin_categories WHERE name = 'Vendas de CRM' LIMIT 1;
    SELECT id INTO v_cat_aluguel_id FROM m4_fin_categories WHERE name = 'Aluguel Escritório' LIMIT 1;
    SELECT id INTO v_cat_salarios_id FROM m4_fin_categories WHERE name = 'Folha de Pagamento' LIMIT 1;

    -- 7. Conta Bancária
    INSERT INTO m4_fin_bank_accounts (name, bank, type, balance, current_balance, workspace_id)
    VALUES ('Banco Digital PJ', 'Nubank', 'checking', 25000.00, 25000.00, v_workspace_id)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_bank_pj_id FROM m4_fin_bank_accounts WHERE name = 'Banco Digital PJ' LIMIT 1;

    -- 8. Transações Financeiras (Lançamentos)
    INSERT INTO m4_fin_transactions (workspace_id, type, description, amount, status, due_date, competence_date, bank_account_id, category_id)
    VALUES 
    (v_workspace_id, 'income', 'Mensalidade Tech Soluções', 5000.00, 'paid', CURRENT_DATE - 5, CURRENT_DATE - 5, v_bank_pj_id, v_cat_vendas_id),
    (v_workspace_id, 'expense', 'Aluguel mensal', 3200.00, 'paid', CURRENT_DATE - 2, CURRENT_DATE - 2, v_bank_pj_id, v_cat_aluguel_id),
    (v_workspace_id, 'income', 'Projeto E-commerce Moda', 12000.00, 'pending', CURRENT_DATE + 10, CURRENT_DATE + 10, v_bank_pj_id, v_cat_vendas_id)
    ON CONFLICT DO NOTHING;

    -- 9. Tarefas de Exemplo
    INSERT INTO m4_tasks (workspace_id, title, description, status, priority, type, client_id, company_id)
    VALUES 
    (v_workspace_id, 'Setup de Automações TECH', 'Configurar filtros de leads no CRM', 'Em Execução', 'Alta', 'Operacional', NULL, v_company_tech_id),
    (v_workspace_id, 'Reunião de Alinhamento MODA', 'Follow-up da proposta de e-commerce', 'Pendente', 'Média', 'Comercial', NULL, v_company_fashion_id)
    ON CONFLICT DO NOTHING;

END $$;
