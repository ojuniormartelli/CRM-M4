-- =========================================================
-- DATABASE_CLEAN_RESET.sql
-- Reset seguro da estrutura do M4 CRM no schema public
-- =========================================================
-- Objetivo:
-- - limpar a estrutura do app M4 CRM
-- - preservar schemas internos do Supabase
-- - não apagar usuários do auth.users
-- - preparar o banco para rodar o DATABASE_COMPLETE_INSTALL.sql
--
-- Atenção:
-- - use este script apenas em ambiente novo, teste ou reset controlado
-- - este script remove tabelas, funções, policies, trigger e enums do projeto
-- =========================================================

BEGIN;

-- =========================================================
-- 1. REMOVER TRIGGER DO AUTH
-- =========================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- =========================================================
-- 2. REMOVER POLICIES DAS TABELAS M4_*
-- =========================================================

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename LIKE 'm4_%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_insert ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_update ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_delete ON public.%I', t, t);
    END LOOP;

    DROP POLICY IF EXISTS m4_workspaces_select ON public.m4_workspaces;
    DROP POLICY IF EXISTS m4_users_select ON public.m4_users;
    DROP POLICY IF EXISTS m4_users_update ON public.m4_users;
    DROP POLICY IF EXISTS m4_workspace_users_select ON public.m4_workspace_users;
END
$$;

-- =========================================================
-- 3. REMOVER TABELAS DO PROJETO
-- =========================================================

DROP TABLE IF EXISTS public.m4_automation_logs CASCADE;
DROP TABLE IF EXISTS public.m4_automations CASCADE;
DROP TABLE IF EXISTS public.m4_goals CASCADE;

DROP TABLE IF EXISTS public.m4_fin_budgets CASCADE;
DROP TABLE IF EXISTS public.m4_fin_transactions CASCADE;
DROP TABLE IF EXISTS public.m4_fin_bank_accounts CASCADE;
DROP TABLE IF EXISTS public.m4_fin_payment_methods CASCADE;
DROP TABLE IF EXISTS public.m4_fin_counterparties CASCADE;
DROP TABLE IF EXISTS public.m4_fin_cost_centers CASCADE;
DROP TABLE IF EXISTS public.m4_fin_categories CASCADE;

DROP TABLE IF EXISTS public.m4_posts CASCADE;
DROP TABLE IF EXISTS public.m4_campaigns CASCADE;
DROP TABLE IF EXISTS public.m4_emails CASCADE;
DROP TABLE IF EXISTS public.m4_services CASCADE;
DROP TABLE IF EXISTS public.m4_tasks CASCADE;
DROP TABLE IF EXISTS public.m4_client_accounts CASCADE;
DROP TABLE IF EXISTS public.m4_clients CASCADE;
DROP TABLE IF EXISTS public.m4_projects CASCADE;
DROP TABLE IF EXISTS public.m4_leads CASCADE;
DROP TABLE IF EXISTS public.m4_contacts CASCADE;
DROP TABLE IF EXISTS public.m4_companies CASCADE;
DROP TABLE IF EXISTS public.m4_pipeline_stages CASCADE;
DROP TABLE IF EXISTS public.m4_pipelines CASCADE;

DROP TABLE IF EXISTS public.m4_settings CASCADE;
DROP TABLE IF EXISTS public.m4_workspace_users CASCADE;
DROP TABLE IF EXISTS public.m4_users CASCADE;
DROP TABLE IF EXISTS public.m4_job_roles CASCADE;
DROP TABLE IF EXISTS public.m4_workspaces CASCADE;

-- =========================================================
-- 4. REMOVER FUNÇÕES DO PROJETO
-- =========================================================

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_workspace_id() CASCADE;

-- =========================================================
-- 5. REMOVER ENUMS DO PROJETO
-- =========================================================

DROP TYPE IF EXISTS public.fin_transaction_type CASCADE;
DROP TYPE IF EXISTS public.fin_transaction_status CASCADE;
DROP TYPE IF EXISTS public.fin_category_type CASCADE;
DROP TYPE IF EXISTS public.fin_classification_type CASCADE;
DROP TYPE IF EXISTS public.fin_counterparty_type CASCADE;
DROP TYPE IF EXISTS public.fin_bank_account_type CASCADE;

-- =========================================================
-- 6. LIMPEZA OPCIONAL DE OBJETOS SOLTOS COM PREFIXO M4_
-- =========================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT schemaname, viewname
        FROM pg_views
        WHERE schemaname = 'public'
          AND viewname LIKE 'm4_%'
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', r.schemaname, r.viewname);
    END LOOP;
END
$$;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT schemaname, matviewname
        FROM pg_matviews
        WHERE schemaname = 'public'
          AND matviewname LIKE 'm4_%'
    LOOP
        EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %I.%I CASCADE', r.schemaname, r.matviewname);
    END LOOP;
END
$$;

-- =========================================================
-- 7. CONFIRMAÇÃO
-- =========================================================

COMMENT ON SCHEMA public IS 'Schema public limpo para reinstalacao do M4 CRM';

COMMIT;