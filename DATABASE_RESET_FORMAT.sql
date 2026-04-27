-- ⚠️ AVISO: ESTE SCRIPT É DESTRUTIVO! ⚠️
-- Ele apaga TODO o schema 'public', incluindo tabelas, funções e tipos.
-- Use apenas se desejar "formatar" o banco de dados para uma instalação limpa.

-- 1. Reset Total do Schema Public
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- 2. Restauração de Permissões Básicas para Supabase
-- Garante que as roles do Supabase continuem tendo acesso ao novo schema public
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- 3. Configurações de Privilégios Padrão (Essencial para objetos criados futuramente)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

COMMENT ON SCHEMA public IS 'Schema public formatado para M4 CRM (Pronto para Instalacao)';
