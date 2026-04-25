import React, { useState } from "react";
import { ICONS } from "../constants";
import { SEED_SQL, FULL_SETUP_SQL, UPDATE_SQL, MIGRATION_SQL } from "../src/constants/sqlScripts";

const TechnicalPanel: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleResetConfig = () => {
    if (
      window.confirm(
        "Tem certeza que deseja reconfigurar a conexão? Isso limpará as credenciais do Supabase salvas localmente.",
      )
    ) {
      localStorage.removeItem("supabase_url");
      localStorage.removeItem("supabase_anon_key");
      localStorage.removeItem("m4_crm_user_id");
      window.location.reload();
    }
  };

  const seedSQL = SEED_SQL;
  const fullSetupSQL = FULL_SETUP_SQL;
  const updateSQL = UPDATE_SQL;
  const migrationSQL = MIGRATION_SQL;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="h-full overflow-y-auto pr-4 scrollbar-none max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-blue-100">
          <ICONS.Settings />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Painel Técnico SQL
          </h2>
          <p className="text-slate-500 font-medium italic">
            Gerencie a estrutura do seu banco de dados de forma simplificada.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Opção 1: Setup Completo */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                1. Reset & Instalação Total
              </h3>
              <p className="text-xs font-bold text-red-500 mt-1 uppercase tracking-widest">
                ⚠️ APAGA TUDO E RECOMEÇA DO ZERO
              </p>
            </div>
            <button
              onClick={() => handleCopy(fullSetupSQL, "full")}
              className={`p-4 rounded-2xl transition-all ${copied === "full" ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white"}`}
            >
              {copied === "full" ? "Copiado!" : "Copiar SQL"}
            </button>
          </div>
          <div className="relative">
            <pre className="bg-slate-900 text-blue-300 p-8 rounded-[1.75rem] text-[10px] font-mono overflow-x-auto max-h-[300px] scrollbar-thin">
              {fullSetupSQL}
            </pre>
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-900 to-transparent rounded-b-[1.75rem]"></div>
          </div>
          <div className="mt-8 p-6 bg-red-50 rounded-2xl border border-red-100 flex gap-4">
            <div className="text-red-500">
              <ICONS.Plus className="rotate-45" />
            </div>
            <p className="text-[11px] font-bold text-red-700 leading-relaxed uppercase">
              CUIDADO: Este script apaga permanentemente todos os dados das tabelas 'm4_' 
              e reinstala o sistema do zero.
            </p>
          </div>
        </div>

        {/* Opção 2: Atualização Segura */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-xl transition-all group bg-blue-50/10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-black text-blue-900 dark:text-blue-400 uppercase tracking-tight">
                2. Atualização Segura
              </h3>
              <p className="text-xs font-bold text-blue-400 mt-1 uppercase tracking-widest">
                Sem apagar dados
              </p>
            </div>
            <button
              onClick={() => handleCopy(updateSQL, "update")}
              className={`p-4 rounded-2xl transition-all ${copied === "update" ? "bg-emerald-500 text-white" : "bg-blue-50 text-blue-400 hover:bg-blue-600 hover:text-white"}`}
            >
              {copied === "update" ? "Copiado!" : "Copiar SQL"}
            </button>
          </div>
          <div className="relative">
            <pre className="bg-slate-900 text-indigo-300 p-8 rounded-[1.75rem] text-[10px] font-mono overflow-x-auto max-h-[300px] scrollbar-thin">
              {updateSQL}
            </pre>
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-900 to-transparent rounded-b-[1.75rem]"></div>
          </div>
          <div className="mt-8 p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-4">
            <div className="text-emerald-500">
              <ICONS.Automation />
            </div>
            <p className="text-[11px] font-bold text-emerald-700 leading-relaxed uppercase">
              Use este script para atualizar um banco existente. Ele adiciona
              novas colunas e tabelas sem afetar seus dados.
            </p>
          </div>
        </div>

        {/* Opção 3: Dados de Teste (Seed) */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-emerald-200 dark:border-emerald-800 shadow-sm hover:shadow-xl transition-all group bg-emerald-50/10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-tight">
                3. Dados de Teste (Seed)
              </h3>
              <p className="text-xs font-bold text-emerald-400 mt-1 uppercase tracking-widest">
                Popular para demonstração
              </p>
            </div>
            <button
              onClick={() => handleCopy(seedSQL, "seed")}
              className={`p-4 rounded-2xl transition-all ${copied === "seed" ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-400 hover:bg-blue-600 hover:text-white"}`}
            >
              {copied === "seed" ? "Copiado!" : "Copiar SQL"}
            </button>
          </div>
          <div className="relative">
            <pre className="bg-slate-900 text-emerald-300 p-8 rounded-[1.75rem] text-[10px] font-mono overflow-x-auto max-h-[300px] scrollbar-thin">
              {seedSQL}
            </pre>
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-900 to-transparent rounded-b-[1.75rem]"></div>
          </div>
          <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4">
            <div className="text-blue-500">
              <ICONS.Database />
            </div>
            <p className="text-[11px] font-bold text-blue-700 leading-relaxed uppercase">
              Use este script para popular o banco com leads, empresas e 
              lançamentos financeiros de exemplo.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-12 rounded-[3.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="flex-1 space-y-4">
          <h4 className="text-2xl font-black uppercase tracking-tight">
            Migração de Dados
          </h4>
          <p className="text-slate-400 font-medium text-sm">
            Use este script para migrar dados das tabelas antigas para a nova
            estrutura financeira (m4_fin).
          </p>
          <button
            onClick={() => handleCopy(migrationSQL, "migration")}
            className={`px-8 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${copied === "migration" ? "bg-emerald-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`}
          >
            {copied === "migration" ? "Copiado!" : "Copiar SQL de Migração"}
          </button>
        </div>
        <div className="w-48 h-48 bg-blue-600/20 rounded-[2.5rem] border border-blue-500/30 flex items-center justify-center">
          <ICONS.Database size={48} className="text-blue-400" />
        </div>
      </div>

      <div className="bg-slate-900 p-12 rounded-[3.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="flex-1 space-y-4">
          <h4 className="text-2xl font-black uppercase tracking-tight">
            Como Aplicar?
          </h4>
          <ol className="space-y-3 text-slate-400 font-medium text-sm list-decimal ml-5">
            <li>
              Acesse o dashboard do seu projeto no{" "}
              <a
                href="https://supabase.com"
                target="_blank"
                className="text-blue-400 hover:underline"
              >
                Supabase
              </a>
              .
            </li>
            <li>
              No menu lateral esquerdo, clique em{" "}
              <span className="text-white font-bold">"SQL Editor"</span>.
            </li>
            <li>
              Clique em{" "}
              <span className="text-white font-bold">"+ New Query"</span>.
            </li>
            <li>
              Cole o código copiado aqui e clique em{" "}
              <span className="text-blue-500 font-black italic">"RUN"</span>.
            </li>
            <li>Pronto! Seu CRM estará atualizado.</li>
          </ol>
        </div>
        <div className="w-48 h-48 bg-blue-600/20 rounded-[2.5rem] border border-blue-500/30 flex items-center justify-center animate-pulse">
          <ICONS.Search />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-12 p-10 bg-rose-50 dark:bg-rose-950/20 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/30">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h3 className="text-xl font-black text-rose-900 dark:text-rose-400 uppercase tracking-tight">
              Zona de Perigo
            </h3>
            <p className="text-sm font-bold text-rose-600 dark:text-rose-500 uppercase tracking-widest mt-1">
              Ações irreversíveis de configuração
            </p>
          </div>
          <button
            onClick={handleResetConfig}
            className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 dark:shadow-none"
          >
            Reconfigurar Conexão (Reset)
          </button>
        </div>
      </div>
    </div>
  );
};

export default TechnicalPanel;
