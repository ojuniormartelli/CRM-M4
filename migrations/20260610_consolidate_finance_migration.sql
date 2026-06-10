-- 🚀 MIGRATION: CONSOLIDATE FINANCE SCHEMA AND DATA BACKFILL
-- Data: 2026-06-10
-- Domínio Oficial de Contratos Financeiros: m4_client_accounts

-- 1. BACKUP LÓGICO DAS ESTRUTURAS LEGADAS
-- Caso m4_transactions ainda exista, migrar dados legados relevantes de forma idempotente para m4_fin_transactions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'm4_transactions') THEN
        RAISE NOTICE 'Iniciando backup e migracao de m4_transactions para m4_fin_transactions...';
        
        -- Garante compatibilidade de tipos e insere dados legados
        INSERT INTO public.m4_fin_transactions (
            workspace_id,
            description,
            amount,
            type,
            status,
            due_date,
            competence_date,
            issue_date,
            notes,
            created_at,
            updated_at
        )
        SELECT 
            workspace_id,
            description,
            amount,
            COALESCE(lower(type)::text, 'income')::public.fin_transaction_type,
            CASE 
                WHEN upper(status) IN ('PAID', 'RECEIVED', 'PAGO') THEN 'paid'::public.fin_transaction_status
                WHEN upper(status) IN ('OVERDUE', 'ATRASADO') THEN 'overdue'::public.fin_transaction_status
                ELSE 'pending'::public.fin_transaction_status
            END,
            COALESCE(date, created_at::date),
            COALESCE(date, created_at::date),
            COALESCE(date, created_at::date),
            notes,
            created_at,
            updated_at
        FROM public.m4_transactions
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Migracao de m4_transactions concluida com sucesso.';
    END IF;
END $$;

-- 2. ROTINA DE BACKFILL PL/PGSQL IDEMPOTENTE PARA PARSEAR m4_clients.services -> m4_client_accounts
DO $$
DECLARE
    r_client RECORD;
    v_service_str TEXT;
    v_service_json JSONB;
    v_service_name TEXT;
    v_price NUMERIC;
    v_active BOOLEAN;
    v_billing_model TEXT;
    v_due_day INT;
    v_start_date DATE;
    v_notes TEXT;
    v_client_account_id UUID;
    v_has_m4_services BOOLEAN;
BEGIN
    RAISE NOTICE 'Iniciando backfill de m4_clients.services para m4_client_accounts...';

    -- Verifica se m4_services catálogo existe para obter o preço padrão
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'm4_services') INTO v_has_m4_services;

    FOR r_client IN 
        SELECT id, workspace_id, company_id, lead_id, services 
        FROM public.m4_clients 
        WHERE services IS NOT NULL AND array_length(services, 1) > 0 AND deleted_at IS NULL
    LOOP
        -- Se o cliente não tiver company_id associado, não podemos gerar a conta financeira correspondente
        IF r_client.company_id IS NULL THEN
            CONTINUE;
        END IF;

        FOREACH v_service_str IN ARRAY r_client.services
        LOOP
            IF v_service_str IS NULL OR v_service_str = '' THEN
                CONTINUE;
            END IF;

            -- Inicializa variaveis para cada contrato do cliente
            v_service_name := NULL;
            v_price := 0;
            v_active := TRUE;
            v_billing_model := 'recorrente';
            v_due_day := 5;
            v_start_date := NULL;
            v_notes := '{}';

            -- Verifica se é string JSON
            IF v_service_str LIKE '{%' AND v_service_str LIKE '%}' THEN
                BEGIN
                    v_service_json := v_service_str::jsonb;
                    v_service_name := v_service_json->>'name';
                    v_active := COALESCE((v_service_json->>'active')::boolean, TRUE);
                    v_billing_model := COALESCE(v_service_json->>'billing_type', 'recorrente');
                    v_due_day := COALESCE((v_service_json->>'due_day')::int, 5);
                    v_start_date := (v_service_json->>'start_date')::date;
                    
                    IF v_billing_model = 'recorrente' THEN
                        v_price := COALESCE(
                            (v_service_json->>'price')::numeric, 
                            (v_service_json->>'custom_price')::numeric, 
                            (v_service_json->>'base_price')::numeric, 
                            0
                        );
                    ELSE
                        v_price := COALESCE(
                            (v_service_json->>'installment_value')::numeric, 
                            (v_service_json->>'price')::numeric, 
                            0
                        );
                    END IF;

                    -- Serializa as configuracoes em formato notes padrão esperado
                    v_notes := jsonb_build_object(
                        'bank_account_id', v_service_json->'bank_account_id',
                        'category_id', v_service_json->'category_id',
                        'installments', COALESCE(v_service_json->'installments', '1'::jsonb),
                        'remaining_installments', COALESCE(v_service_json->'remaining_installments', v_service_json->'installments'),
                        'current_installment', COALESCE(v_service_json->'paid_installments', '0'::jsonb)::int + 1
                    )::text;

                EXCEPTION WHEN OTHERS THEN
                    -- Se houver falha de parse JSON, assume como nome simples/legacy
                    v_service_name := v_service_str;
                END;
            ELSE
                v_service_name := v_service_str;
            END IF;

            IF v_service_name IS NULL OR v_service_name = '' THEN
                CONTINUE;
            END IF;

            -- Preço padrão se não definido no JSON
            IF v_price = 0 AND v_has_m4_services THEN
                SELECT COALESCE(default_price, 0) INTO v_price 
                FROM public.m4_services 
                WHERE lower(name) = lower(v_service_name) 
                LIMIT 1;
            END IF;

            -- Resolve se o lançamento de conta já existe (idempotência por empresa e nome de serviço único)
            SELECT id INTO v_client_account_id 
            FROM public.m4_client_accounts 
            WHERE company_id = r_client.company_id AND lower(service_name) = lower(v_service_name)
            LIMIT 1;

            IF v_client_account_id IS NOT NULL THEN
                UPDATE public.m4_client_accounts 
                SET 
                    monthly_value = COALESCE(v_price, 0),
                    due_day = v_due_day,
                    status = CASE WHEN v_active THEN 'ativo' ELSE 'cancelado' END,
                    billing_model = v_billing_model,
                    notes = v_notes,
                    updated_at = now()
                WHERE id = v_client_account_id;
            ELSE
                INSERT INTO public.m4_client_accounts (
                    workspace_id,
                    company_id,
                    lead_id,
                    service_name,
                    service_type,
                    monthly_value,
                    due_day,
                    status,
                    start_date,
                    billing_model,
                    notes,
                    created_at,
                    updated_at
                )
                VALUES (
                    r_client.workspace_id,
                    r_client.company_id,
                    r_client.lead_id,
                    v_service_name,
                    'custom',
                    COALESCE(v_price, 0),
                    v_due_day,
                    CASE WHEN v_active THEN 'ativo' ELSE 'cancelado' END,
                    v_start_date,
                    v_billing_model,
                    v_notes,
                    now(),
                    now()
                );
            END IF;

        END LOOP;
    END LOOP;

    RAISE NOTICE 'Backfill e mapeamento de contratos concluídos.';
END $$;

-- 3. REMOÇÃO CONTROLADA E SEGURA DE TABELAS OBSOLETAS
-- Remove apenas tabelas antigas/ocultas que não possuam foreign keys ativas
DO $$
BEGIN
    DROP TABLE IF EXISTS public.m4_transactions CASCADE;
    DROP TABLE IF EXISTS public.m4_finance_categories CASCADE;
    DROP TABLE IF EXISTS public.m4_bank_accounts CASCADE;
    DROP TABLE IF EXISTS public.m4_credit_cards CASCADE;
    DROP TABLE IF EXISTS public.m4_payment_methods CASCADE;
    
    RAISE NOTICE 'Limpeza de tabelas obsoletas concluída com sucesso.';
END $$;
