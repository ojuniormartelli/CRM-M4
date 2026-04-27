-- ⚠️ SCRIPT 1: RESET TOTAL E PREPARAÇÃO DO SCHEMA ⚠️
-- Este script apaga e recria o schema public, restaurando permissões do Supabase.

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Restauração de Permissões Básicas para Roles do Supabase
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- Configurações de Privilégios Padrão para novos objetos
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

COMMENT ON SCHEMA public IS 'Schema public resetado para instalacao limpa do M4 CRM';
