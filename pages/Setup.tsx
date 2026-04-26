import React, { useState } from "react";
import { ICONS } from "../constants";
import { updateSupabaseClient } from "../lib/supabase";
import { motion } from "motion/react";

const Setup: React.FC = () => {
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [step, setStep] = useState<"config" | "installing" | "success">(
    "config",
  );
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fullSetupSQL = `-- 🚀 SCRIPT DE INSTALAÇÃO COMPLETA (M4 CRM & Agency Suite)
-- ⚠️ AVISO: Este script apaga todas as tabelas existentes para uma instalação limpa.

-- 1. LIMPEZA TOTAL (ATENÇÃO: APAGA TUDO!)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Apaga Tabelas
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'm4_%') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;

    -- Apaga Tipos/Enums (Opcional, mas recomendado para reset limpo)
    DROP TYPE IF EXISTS fin_transaction_type CASCADE;
    DROP TYPE IF EXISTS fin_transaction_status CASCADE;
    DROP TYPE IF EXISTS fin_category_type CASCADE;
    DROP TYPE IF EXISTS fin_classification_type CASCADE;
    DROP TYPE IF EXISTS fin_counterparty_type CASCADE;
    DROP TYPE IF EXISTS fin_bank_account_type CASCADE;
END $$;

-- 2. ENUMS FINANCEIROS
DO $$ 
BEGIN
    DROP TYPE IF EXISTS fin_transaction_type CASCADE;
    CREATE TYPE fin_transaction_type AS ENUM ('income', 'expense', 'transfer', 'adjustment');
    
    DROP TYPE IF EXISTS fin_transaction_status CASCADE;
    CREATE TYPE fin_transaction_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'canceled');
    
    DROP TYPE IF EXISTS fin_category_type CASCADE;
    CREATE TYPE fin_category_type AS ENUM ('income', 'expense', 'both');
    
    DROP TYPE IF EXISTS fin_classification_type CASCADE;
    CREATE TYPE fin_classification_type AS ENUM ('operacional', 'nao_operacional', 'financeiro', 'tributario');
    
    DROP TYPE IF EXISTS fin_counterparty_type CASCADE;
    CREATE TYPE fin_counterparty_type AS ENUM ('cliente', 'fornecedor', 'colaborador', 'parceiro', 'outro');
    
    DROP TYPE IF EXISTS fin_bank_account_type CASCADE;
    CREATE TYPE fin_bank_account_type AS ENUM ('checking', 'savings', 'cash', 'credit_account', 'investment');
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Erro ao criar Enums: %', SQLERRM;
END $$;

-- 3. NÚCLEO TENANT (Workspaces & Usuários)
CREATE TABLE public.m4_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    branding_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_job_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level INTEGER DEFAULT 10,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'user')),
    job_role_id UUID REFERENCES public.m4_job_roles(id) ON DELETE SET NULL,
    avatar_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. SINCRONIZAÇÃO DE USUÁRIOS (SUPABASE AUTH)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.m4_users (id, name, email, role, workspace_id, status)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    new.email, 
    'owner', 
    'fb786658-1234-4321-8888-999988887777', 
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Pipelines e Stages
INSERT INTO public.m4_pipelines (id, workspace_id, name, position)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fb786658-1234-4321-8888-999988887777', 'Vendas Comercial', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.m4_pipeline_stages (id, pipeline_id, workspace_id, name, position, status)
VALUES 
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fb786658-1234-4321-8888-999988887777', 'Lead', 0, 'inicial'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fb786658-1234-4321-8888-999988887777', 'Qualificação', 1, 'intermediario'),
  ('dddddddd-dddd-dddd-dddd-ddddbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fb786658-1234-4321-8888-999988887777', 'Proposta', 2, 'intermediario'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fb786658-1234-4321-8888-999988887777', 'Fechamento', 3, 'ganho')
ON CONFLICT (id) DO NOTHING;

-- 8. PERMISSÕES E RLS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Ativar RLS e Aplicar Políticas de Isolamento por Workspace e Soft Delete
CREATE OR REPLACE FUNCTION public.get_current_workspace_id() 
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT workspace_id FROM public.m4_users WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

DO $$ 
DECLARE
    t text;
    has_deleted_at boolean;
BEGIN
    FOR t IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE 'm4_%' 
    ) LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all access" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Workspace Access" ON %I', t);

        IF t IN ('m4_workspaces', 'm4_users', 'm4_workspace_users') THEN
            CONTINUE;
        END IF;

        -- Verificar se a tabela tem a coluna deleted_at
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = t AND column_name = 'deleted_at'
        ) INTO has_deleted_at;

        IF has_deleted_at THEN
            EXECUTE format('
                CREATE POLICY "Workspace Access" ON %I 
                FOR ALL 
                TO authenticated 
                USING (workspace_id = public.get_current_workspace_id() AND deleted_at IS NULL)
                WITH CHECK (workspace_id = public.get_current_workspace_id())
            ', t);
        ELSE
            EXECUTE format('
                CREATE POLICY "Workspace Access" ON %I 
                FOR ALL 
                TO authenticated 
                USING (workspace_id = public.get_current_workspace_id())
                WITH CHECK (workspace_id = public.get_current_workspace_id())
            ', t);
        END IF;
    END LOOP;
END $$;

-- Políticas Especiais para Tabelas de Core
CREATE POLICY "Workspace Member Visibility" ON public.m4_workspaces FOR SELECT TO authenticated USING (id IN (SELECT workspace_id FROM public.m4_users WHERE id = auth.uid()));
CREATE POLICY "User Profile Visibility" ON public.m4_users FOR SELECT TO authenticated USING (workspace_id = public.get_current_workspace_id());
CREATE POLICY "User Self Update" ON public.m4_users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.m4_users TO anon;
`;

  const handleInstall = async () => {
    if (!url || !anonKey) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setStep("installing");
    setError(null);

    try {
      // 1. Salvar no localStorage
      localStorage.setItem("supabase_url", url);
      localStorage.setItem("supabase_anon_key", anonKey);

      // 2. Atualizar cliente
      const supabase = updateSupabaseClient(url, anonKey);

      // 3. Simular progresso
      setProgress("Verificando conexão...");
      await new Promise((r) => setTimeout(r, 1000));

      setProgress("Criando tabelas e estruturas...");

      const defaultWorkspaceId = "fb786658-1234-4321-8888-999988887777";

      // Verificar se a tabela de workspaces existe
      const { error: wsCheckError } = await supabase
        .from("m4_workspaces")
        .select("id")
        .limit(1);

      if (wsCheckError) {
        if (wsCheckError.code === "42P01") {
          throw new Error(
            "As tabelas ainda não foram criadas no seu Supabase. Por favor, execute o script SQL abaixo no seu painel do Supabase antes de continuar.",
          );
        }
        throw wsCheckError;
      }

      setProgress("Configurando workspace principal...");
      await supabase.from("m4_workspaces").upsert({
        id: defaultWorkspaceId,
        name: "Workspace Principal",
      });

      setProgress("Configurando configurações do CRM...");
      await supabase.from("m4_settings").upsert(
        {
          workspace_id: defaultWorkspaceId,
          crm_name: "M4 CRM",
          company_name: "Agency Cloud",
        },
        { onConflict: "workspace_id" },
      );

      setProgress("Configurando pipelines de demonstração...");
      const pipelines = [
        {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          name: "Vendas Comercial",
          position: 0,
          workspace_id: defaultWorkspaceId,
        },
      ];
      await supabase.from("m4_pipelines").upsert(pipelines);

      setProgress("Configurando etapas do funil...");
      const stages = [
        {
          id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          pipeline_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          workspace_id: defaultWorkspaceId,
          name: "Lead",
          position: 0,
          color: "blue",
          status: "inicial",
        },
        {
          id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
          pipeline_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          workspace_id: defaultWorkspaceId,
          name: "Qualificação",
          position: 1,
          color: "amber",
          status: "intermediario",
        },
        {
          id: "dddddddd-dddd-dddd-dddd-ddddbbbbbbbb",
          pipeline_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          workspace_id: defaultWorkspaceId,
          name: "Proposta",
          position: 2,
          color: "indigo",
          status: "intermediario",
        },
        {
          id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
          pipeline_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          workspace_id: defaultWorkspaceId,
          name: "Fechamento",
          position: 3,
          color: "emerald",
          status: "ganho",
        },
      ];
      await supabase.from("m4_pipeline_stages").upsert(stages);

      setProgress("Finalizando configuração...");
      await new Promise((r) => setTimeout(r, 1000));

      setStep("success");
    } catch (err: any) {
      setError(err.message);
      setStep("config");
    }
  };

  const copySQL = () => {
    navigator.clipboard.writeText(fullSetupSQL);
    alert("SQL copiado! Cole-o no SQL Editor do seu Supabase e clique em RUN.");
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-[3rem] shadow-2xl shadow-blue-100 max-w-md w-full text-center space-y-8"
        >
          <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-emerald-100">
            <ICONS.Check size={48} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Tudo pronto!
            </h2>
            <p className="text-slate-500 font-medium">
              Seu CRM foi configurado com sucesso.
            </p>
          </div>

          <div className="bg-slate-50 p-6 rounded-3xl text-left space-y-4 border border-slate-100">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Credenciais de Acesso:
            </p>
            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-700">
                Usuário: <span className="text-blue-600">admin</span>
              </p>
              <p className="text-sm font-bold text-slate-700">
                Senha: <span className="text-blue-600">admin123</span>
              </p>
            </div>
            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tight">
              ⚠️ Troca de senha obrigatória no primeiro acesso.
            </p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all transform hover:-translate-y-1"
          >
            Acessar o CRM
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-12 rounded-[3rem] shadow-2xl shadow-blue-100 max-w-xl w-full space-y-10"
      >
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-blue-100">
            <ICONS.Automation size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              M4 CRM
            </h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">
              Setup Inicial
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Bem-vindo! Vamos configurar seu CRM
          </h2>
          <p className="text-slate-500 font-medium">
            Você precisará de uma conta gratuita no{" "}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 font-bold hover:underline"
            >
              Supabase
            </a>{" "}
            para armazenar seus dados.
          </p>
        </div>

        {error && (
          <div className="p-6 bg-red-50 rounded-3xl border border-red-100 space-y-4">
            <div className="flex gap-3 text-red-600">
              <ICONS.AlertTriangle size={20} />
              <p className="text-sm font-bold leading-relaxed">{error}</p>
            </div>
            {error.includes("tabelas") && (
              <button
                onClick={copySQL}
                className="w-full py-3 bg-white text-red-600 border border-red-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all"
              >
                Copiar Script SQL de Instalação
              </button>
            )}
          </div>
        )}

        {step === "installing" ? (
          <div className="py-12 text-center space-y-6">
            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-600 font-black uppercase text-xs tracking-widest animate-pulse">
              {progress}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                URL do Supabase
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xxx.supabase.co"
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-slate-700 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                Anon Key
              </label>
              <input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="Sua chave pública (anon key)"
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-slate-700 transition-all"
              />
            </div>

            <button
              onClick={handleInstall}
              className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3"
            >
              <ICONS.Plus size={20} />
              Instalar e Configurar
            </button>
          </div>
        )}

        <div className="pt-6 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Ao clicar em instalar, criaremos a estrutura necessária no seu
            banco.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Setup;
