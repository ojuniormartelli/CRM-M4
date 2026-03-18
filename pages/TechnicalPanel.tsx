
import React, { useState } from 'react';
import { ICONS } from '../constants';

const TechnicalPanel: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const fullSetupSQL = `-- 🚀 SCRIPT DE INSTALAÇÃO COMPLETA (M4 CRM)
-- ATENÇÃO: Use este script apenas se estiver configurando do zero.

-- 1. Tabela de Leads
CREATE TABLE IF NOT EXISTS m4_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  pipelineId TEXT DEFAULT 'p1',
  stageId TEXT DEFAULT 's1',
  value NUMERIC DEFAULT 0,
  notes TEXT,
  createdAt TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Tarefas
CREATE TABLE IF NOT EXISTS m4_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Pendente',
  priority TEXT DEFAULT 'Média',
  assignedTo TEXT,
  dueDate DATE,
  createdAt TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Transações Financeiras
CREATE TABLE IF NOT EXISTS m4_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'Receita' ou 'Despesa'
  category TEXT,
  amount NUMERIC NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  status TEXT DEFAULT 'Pendente' -- 'Pago' ou 'Pendente'
);

-- 4. Tabela de E-mails
CREATE TABLE IF NOT EXISTS m4_emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_name TEXT,
  sender_email TEXT,
  recipient_email TEXT,
  subject TEXT,
  body TEXT,
  folder TEXT DEFAULT 'inbox', -- 'inbox', 'sent', 'drafts', 'trash'
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);`;

  const updateOnlySQL = `-- 🔄 SCRIPT DE ATUALIZAÇÃO (SEM PERDA DE DADOS)
-- Use este script para adicionar novas funcionalidades a um banco já existente.

-- Adiciona tabela de E-mails (caso não exista)
CREATE TABLE IF NOT EXISTS m4_emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_name TEXT,
  sender_email TEXT,
  recipient_email TEXT,
  subject TEXT,
  body TEXT,
  folder TEXT DEFAULT 'inbox',
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Exemplo: Adicionando coluna de responsável em Leads caso esqueça
-- ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS assigned_to TEXT;`;

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
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Painel Técnico</h2>
          <p className="text-slate-500 font-medium italic">Gerencie a estrutura do seu banco de dados no Supabase.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Configuração Inicial</h3>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Setup Completo do Zero</p>
            </div>
            <button 
              onClick={() => handleCopy(fullSetupSQL, 'full')}
              className={`p-4 rounded-2xl transition-all ${copied === 'full' ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white'}`}
            >
              {copied === 'full' ? 'Copiado!' : 'Copiar SQL'}
            </button>
          </div>
          <div className="relative">
            <pre className="bg-slate-900 text-blue-300 p-8 rounded-[1.75rem] text-[10px] font-mono overflow-x-auto max-h-[300px] scrollbar-thin">
              {fullSetupSQL}
            </pre>
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-900 to-transparent rounded-b-[1.75rem]"></div>
          </div>
          <div className="mt-8 p-6 bg-red-50 rounded-2xl border border-red-100 flex gap-4">
             <div className="text-red-500"><ICONS.Plus className="rotate-45" /></div>
             <p className="text-[11px] font-bold text-red-700 leading-relaxed uppercase">Aviso: Rodar este script em um banco com dados pode causar conflitos se as tabelas já existirem. Use com cautela.</p>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group border-blue-100 bg-blue-50/10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-black text-blue-900 uppercase tracking-tight">Atualização Segura</h3>
              <p className="text-xs font-bold text-blue-400 mt-1 uppercase tracking-widest">Incrementos e Migrações</p>
            </div>
            <button 
              onClick={() => handleCopy(updateOnlySQL, 'update')}
              className={`p-4 rounded-2xl transition-all ${copied === 'update' ? 'bg-emerald-500 text-white' : 'bg-blue-50 text-blue-400 hover:bg-blue-600 hover:text-white'}`}
            >
              {copied === 'update' ? 'Copiado!' : 'Copiar SQL'}
            </button>
          </div>
          <div className="relative">
            <pre className="bg-slate-900 text-indigo-300 p-8 rounded-[1.75rem] text-[10px] font-mono overflow-x-auto max-h-[300px] scrollbar-thin">
              {updateOnlySQL}
            </pre>
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-900 to-transparent rounded-b-[1.75rem]"></div>
          </div>
          <div className="mt-8 p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-4">
             <div className="text-emerald-500"><ICONS.Automation /></div>
             <p className="text-[11px] font-bold text-emerald-700 leading-relaxed uppercase">Dica: Este script garante que novas funcionalidades (como o Módulo de Email) sejam instaladas sem apagar seus leads atuais.</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-12 rounded-[3.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="flex-1 space-y-4">
          <h4 className="text-2xl font-black uppercase tracking-tight">Como Aplicar?</h4>
          <ol className="space-y-3 text-slate-400 font-medium text-sm list-decimal ml-5">
            <li>Acesse o dashboard do seu projeto no <a href="https://supabase.com" target="_blank" className="text-blue-400 hover:underline">Supabase</a>.</li>
            <li>No menu lateral esquerdo, clique em <span className="text-white font-bold">"SQL Editor"</span>.</li>
            <li>Clique em <span className="text-white font-bold">"+ New Query"</span>.</li>
            <li>Cole o código copiado aqui e clique em <span className="text-blue-500 font-black italic">"RUN"</span>.</li>
            <li>Pronto! Seu CRM estará 100% funcional.</li>
          </ol>
        </div>
        <div className="w-48 h-48 bg-blue-600/20 rounded-[2.5rem] border border-blue-500/30 flex items-center justify-center animate-pulse">
           <ICONS.Search />
        </div>
      </div>
    </div>
  );
};

export default TechnicalPanel;
