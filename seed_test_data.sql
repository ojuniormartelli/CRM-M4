
-- 🚀 SCRIPT DE SEED DE DADOS DE TESTE (M4 CRM)
-- Este script insere dados de exemplo para demonstração das funcionalidades.

DO $$ 
DECLARE
    v_workspace_id UUID := 'fb786658-1234-4321-8888-999988887777'; -- Workspace Principal
    v_admin_id UUID;
    v_pipeline_vendas_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_stage_lead_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    v_company_id UUID;
BEGIN
    -- 1. Verificar se o Workspace existe
    IF NOT EXISTS (SELECT 1 FROM m4_workspaces WHERE id = v_workspace_id) THEN
        INSERT INTO m4_workspaces (id, name) VALUES (v_workspace_id, 'Workspace Principal');
    END IF;

    -- 2. Garantir usuário admin
    SELECT id INTO v_admin_id FROM m4_users WHERE email = 'admin@m4.com' LIMIT 1;
    IF v_admin_id IS NULL THEN
        v_admin_id := gen_random_uuid();
        INSERT INTO m4_users (id, name, email, role, workspace_id, status)
        VALUES (v_admin_id, 'Administrador M4', 'admin@m4.com', 'owner', v_workspace_id, 'active');
    END IF;

    -- 3. Inserir Empresas de Exemplo
    INSERT INTO m4_companies (name, niche, city, state, workspace_id)
    VALUES 
    ('Tech Soluções LTDA', 'Tecnologia', 'São Paulo', 'SP', v_workspace_id),
    ('Alimentos Brasil S.A.', 'Indústria Alimentícia', 'Curitiba', 'PR', v_workspace_id),
    ('Moda Fashion Brasil', 'Varejo', 'Rio de Janeiro', 'RJ', v_workspace_id)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_company_id FROM m4_companies WHERE name = 'Tech Soluções LTDA' LIMIT 1;

    -- 4. Inserir Leads de Exemplo
    INSERT INTO m4_leads (contact_name, company_name, contact_email, value, status, pipeline_id, stage_id, workspace_id, company_id, responsible_id)
    VALUES 
    ('Implantação ERP', 'Tech Soluções LTDA', 'contato@techsolucoes.com', 55000.00, 'active', v_pipeline_vendas_id, v_stage_lead_id, v_workspace_id, v_company_id, v_admin_id),
    ('Renovação de Contrato', 'Tech Soluções LTDA', 'diretoria@techsolucoes.com', 12000.00, 'active', v_pipeline_vendas_id, v_stage_lead_id, v_workspace_id, v_company_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    -- 5. Inserir Categorias Financeiras
    INSERT INTO m4_fin_categories (name, type, workspace_id)
    VALUES 
    ('Vendas de Serviços', 'income', v_workspace_id),
    ('Aluguel', 'expense', v_workspace_id),
    ('Salários', 'expense', v_workspace_id)
    ON CONFLICT DO NOTHING;

    -- 6. Inserir Conta Bancária
    INSERT INTO m4_fin_bank_accounts (name, bank, type, balance, workspace_id)
    VALUES ('Conta Principal PJ', 'Banco do Brasil', 'checking', 10000.00, v_workspace_id)
    ON CONFLICT DO NOTHING;

END $$;
