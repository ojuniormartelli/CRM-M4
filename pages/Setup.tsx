import React, { useState, useEffect } from "react";
import { ICONS } from "../constants";
import { updateSupabaseClient, getSupabaseConfig } from "../lib/supabase";
import { motion } from "motion/react";
import { FULL_SETUP_SQL, UPDATE_SQL, COMPLETE_INSTALL_SQL, CLEAN_RESET_SQL } from "../src/constants/sqlScripts";

const Setup: React.FC = () => {
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");

  useEffect(() => {
    const config = getSupabaseConfig();
    console.log("Configuração detectada no mount:", config);
    if (config.url && config.url !== 'https://placeholder.supabase.co') setUrl(config.url);
    if (config.key && config.key !== 'placeholder') setAnonKey(config.key);
  }, []);
  const [step, setStep] = useState<"config" | "installing" | "success">(
    "config",
  );
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasSchemaIssue, setHasSchemaIssue] = useState(false);

  const fullSetupSQL = FULL_SETUP_SQL;
  const updateSQL = UPDATE_SQL;
  const completeInstallSQL = COMPLETE_INSTALL_SQL;
  const cleanResetSQL = CLEAN_RESET_SQL;

  const handleInstall = async () => {
    const trimmedUrl = url.trim();
    const trimmedKey = anonKey.trim();

    console.log("Iniciando handleInstall com URL:", trimmedUrl);
    if (!trimmedUrl || !trimmedKey) {
      setError("Por favor, preencha todos os campos (URL e Anon Key).");
      return;
    }

    setStep("installing");
    setError(null);

    try {
      // 1. Tentar salvar no localStorage (pode falhar em alguns iframes ou modo privado)
      try {
        localStorage.setItem("supabase_url", trimmedUrl);
        localStorage.setItem("supabase_anon_key", trimmedKey);
      } catch (lsErr) {
        console.warn("localStorage bloqueado:", lsErr);
      }

      // 2. Atualizar cliente
      const supabase = updateSupabaseClient(trimmedUrl, trimmedKey);
      console.log("Cliente Supabase atualizado com sucesso.");

      // 3. Pequeno delay para feedback visual
      setProgress("Conectando ao Supabase...");
      await new Promise((r) => setTimeout(r, 800));

      setProgress("Verificando estrutura do banco...");

      const defaultWorkspaceId = "fb786658-1234-4321-8888-999988887777";

      // Verificar se a tabela de workspaces existe
      console.log("Executando consulta para verificar m4_workspaces...");
      const { error: wsCheckError } = await supabase
        .from("m4_workspaces")
        .select("id")
        .limit(1);

      if (wsCheckError) {
        console.error("Erro Supabase (Check):", wsCheckError);
        if (wsCheckError.code === "42P01" || wsCheckError.message.includes("does not exist")) {
          throw new Error(
            "Tabelas não encontradas. Por favor, COPIE O SCRIPT SQL de instalação e execute-o no SQL EDITOR do seu painel Supabase."
          );
        }
        if (wsCheckError.code === "PGRST301") {
          throw new Error("Erro de autenticação: JWT inválido ou Anon Key incorreta.");
        }
        throw new Error(wsCheckError.message || `Erro do banco: ${wsCheckError.code}`);
      }

      // Verificação de Soft Delete
      const tablesToCheck = ['m4_tasks', 'm4_clients', 'm4_leads', 'm4_companies'];
      for (const table of tablesToCheck) {
        setProgress(`Validando: ${table}...`);
        const { error: colCheckError } = await supabase.from(table).select('deleted_at').limit(1);
        
        if (colCheckError) {
          console.error(`Erro estrutural em ${table}:`, colCheckError);
          if (colCheckError.message.includes('deleted_at') || colCheckError.code === '42703') {
            setHasSchemaIssue(true);
            throw new Error(`Seu banco está desatualizado (coluna deleted_at ausente em ${table}). Use a ATUALIZAÇÃO SEGURA.`);
          }
        }
      }

      setProgress("Finalizando configuração inicial...");
      
      // Upserts básicos para garantir que o sistema não quebre
      await supabase.from("m4_workspaces").upsert({ id: defaultWorkspaceId, name: "Workspace Principal" });
      await supabase.from("m4_settings").upsert({ workspace_id: defaultWorkspaceId, crm_name: "M4 CRM" }, { onConflict: "workspace_id" });

      console.log("Configuração concluída com sucesso!");
      setStep("success");
    } catch (err: any) {
      console.error("Falha no processo de instalação:", err);
      setError(err.message || "Falha na conexão. Verifique suas credenciais e internet.");
      setStep("config");
    }
  };

  const copySQL = () => {
    navigator.clipboard.writeText(completeInstallSQL);
    alert("SQL de Instalação Completa copiado! Cole-o no SQL Editor do seu Supabase e clique em RUN.");
  };

  const copyResetSQL = () => {
    navigator.clipboard.writeText(cleanResetSQL);
    alert("SQL de Reset Total copiado! CUIDADO: Isso apaga todos os dados do esquema public.");
  };

  const copyUpdateSQL = () => {
    navigator.clipboard.writeText(updateSQL);
    alert("SQL de Migração (Soft Delete) copiado! Cole-o no SQL Editor do seu Supabase e clique em RUN.");
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
            <div className="flex flex-col gap-2">
              <button
                onClick={copySQL}
                className="w-full py-3 bg-white text-blue-600 border border-blue-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
              >
                <ICONS.Copy size={14} />
                Instalação Completa (M4 Tables)
              </button>
              <button
                onClick={copyResetSQL}
                className="w-full py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2"
              >
                <ICONS.Copy size={14} />
                Reset Total (Limpar Banco)
              </button>
              <button
                onClick={copyUpdateSQL}
                className="w-full py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
              >
                <ICONS.Copy size={14} />
                Migrar Schema (Soft Delete)
              </button>
            </div>
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
            <div className="p-8 bg-blue-50/50 rounded-[2rem] border border-blue-100 space-y-4">
            <div className="flex items-center gap-4 text-blue-800">
              <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                <ICONS.Database size={24} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-tight">Base de Dados Vazia?</h3>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Execute o Script de Instalação</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Antes de configurar, você precisa criar a estrutura de tabelas no seu Supabase. Copie o script abaixo e execute-o no <b>SQL Editor</b> do Supabase.
            </p>

            <button
              onClick={copySQL}
              className="w-full py-4 bg-white text-blue-600 border-2 border-blue-200 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-sm hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-center gap-3 group"
            >
              <ICONS.Copy size={16} className="group-hover:scale-110 transition-transform" />
              Copiar DATABASE_COMPLETE_INSTALL.sql
            </button>
          </div>

          <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                URL do Supabase
                {getSupabaseConfig().url && (
                  <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">
                    Auto-detectado
                  </span>
                )}
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
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                Anon Key
                {getSupabaseConfig().key && (
                  <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">
                    Auto-detectado
                  </span>
                )}
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
