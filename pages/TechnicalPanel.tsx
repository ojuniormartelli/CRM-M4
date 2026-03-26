
import React, { useState } from 'react';
import { ICONS } from '../constants';

const TechnicalPanel: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const fullSetupSQL = `-- 🚀 SCRIPT DE INSTALAÇÃO COMPLETA (M4 CRM & Agency Suite)
-- Use este script apenas se estiver configurando do zero.

-- 1. Tabela de Configurações
CREATE TABLE IF NOT EXISTS m4_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID UNIQUE,
    crm_name TEXT DEFAULT 'M4 CRM',
    logo_url TEXT,
    theme TEXT DEFAULT 'light',
    primary_color TEXT DEFAULT '#2563eb',
    company_name TEXT DEFAULT 'Agency Cloud',
    city TEXT,
    state TEXT,
    website_url TEXT,
    whatsapp_number TEXT,
    language TEXT DEFAULT 'pt-BR',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Empresas
CREATE TABLE IF NOT EXISTS public.m4_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  name text NOT NULL,
  cnpj text,
  city text,
  state text,
  segment text,
  website text,
  instagram text,
  phone text,
  whatsapp text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Tabela de Contatos
CREATE TABLE IF NOT EXISTS public.m4_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  company_id uuid REFERENCES public.m4_companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  email text,
  phone text,
  whatsapp text,
  instagram text,
  linkedin text,
  notes text,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. Tabela de Leads (Negócios/Deals)
CREATE TABLE IF NOT EXISTS m4_leads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT, -- Nome da empresa (legado)
    company_id UUID REFERENCES public.m4_companies(id),
    contact_id UUID REFERENCES public.m4_contacts(id),
    email TEXT,
    phone TEXT,
    pipeline_id TEXT DEFAULT 'e167f4e8-4a19-4ab7-b655-f104004f8bf4',
    stage_id TEXT DEFAULT 's1',
    value NUMERIC DEFAULT 0,
    notes TEXT,
    niche TEXT,
    service_type TEXT,
    proposed_ticket NUMERIC DEFAULT 0,
    next_action TEXT,
    next_action_date DATE,
    qualification TEXT,
    source TEXT,
    campaign TEXT,
    city TEXT,
    state TEXT,
    closing_forecast DATE,
    temperature TEXT DEFAULT 'Frio',
    probability INTEGER DEFAULT 0,
    ai_score INTEGER DEFAULT 0,
    ai_reasoning TEXT,
    legal_name TEXT,
    instagram TEXT,
    website TEXT,
    company_email TEXT,
    company_phone TEXT,
    contacts JSONB DEFAULT '[]', -- Legado
    responsible_name TEXT,
    responsible_id TEXT,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'active',
    interactions JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    workspace_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabela de Tarefas
CREATE TABLE IF NOT EXISTS m4_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Pendente',
    priority TEXT DEFAULT 'Média',
    type TEXT DEFAULT 'task',
    due_date TIMESTAMP WITH TIME ZONE,
    lead_id UUID REFERENCES m4_leads(id) ON DELETE CASCADE,
    company_id UUID REFERENCES m4_companies(id),
    deal_id UUID REFERENCES m4_leads(id),
    client_account_id UUID,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_type TEXT,
    recurrence_days TEXT[],
    recurrence_day_of_month INTEGER,
    recurrence_month_week TEXT,
    recurrence_end_date DATE,
    recurrence_occurrences INTEGER,
    workspace_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabela de Contas de Clientes (Follow-up)
CREATE TABLE IF NOT EXISTS m4_client_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES m4_leads(id) ON DELETE CASCADE,
    company_id UUID REFERENCES m4_companies(id),
    status TEXT DEFAULT 'ativo',
    service_type TEXT,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    billing_model TEXT DEFAULT 'recorrente',
    monthly_value NUMERIC DEFAULT 0,
    notes TEXT,
    workspace_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Módulo Financeiro
CREATE TABLE IF NOT EXISTS m4_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    bank_type TEXT,
    current_balance NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'BRL',
    workspace_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m4_credit_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    limit_amount NUMERIC DEFAULT 0,
    closing_day INTEGER,
    due_day INTEGER,
    workspace_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m4_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL,
    category TEXT,
    date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'Pendente',
    bank_account_id UUID REFERENCES m4_bank_accounts(id),
    client_account_id UUID REFERENCES m4_client_accounts(id),
    lead_id UUID REFERENCES m4_leads(id),
    company_id UUID REFERENCES m4_companies(id),
    deal_id UUID REFERENCES m4_leads(id),
    credit_card_id UUID REFERENCES m4_credit_cards(id),
    payment_method TEXT,
    due_date DATE,
    paid_date DATE,
    workspace_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Comunicação e Social
CREATE TABLE IF NOT EXISTS m4_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_name TEXT,
    sender_email TEXT,
    recipient_email TEXT,
    subject TEXT,
    body TEXT,
    folder TEXT DEFAULT 'inbox',
    is_read BOOLEAN DEFAULT FALSE,
    company_id UUID REFERENCES m4_companies(id),
    contact_id UUID REFERENCES m4_contacts(id),
    lead_id UUID REFERENCES m4_leads(id),
    workspace_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m4_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name TEXT,
    user_role TEXT,
    content TEXT,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    type TEXT DEFAULT 'update',
    workspace_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m4_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT,
    status TEXT DEFAULT 'Agendada',
    sent_count INTEGER DEFAULT 0,
    open_rate TEXT DEFAULT '-',
    click_rate TEXT DEFAULT '-',
    workspace_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;

  const updateOnlySQL = `-- 🔄 SCRIPT DE ATUALIZAÇÃO (M4 CRM - CRM Evolution)
-- Use este script para adicionar novas funcionalidades a um banco já existente.

-- 1. Criar tabela de Empresas (se não existir)
CREATE TABLE IF NOT EXISTS public.m4_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  name text NOT NULL,
  cnpj text,
  city text,
  state text,
  segment text,
  website text,
  instagram text,
  phone text,
  whatsapp text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Criar tabela de Contatos (se não existir)
CREATE TABLE IF NOT EXISTS public.m4_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  company_id uuid REFERENCES public.m4_companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  email text,
  phone text,
  whatsapp text,
  instagram text,
  linkedin text,
  notes text,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Vincular Leads (Negócios) às Empresas e Contatos
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.m4_companies(id);
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.m4_contacts(id);
ALTER TABLE public.m4_leads ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- 4. Vincular Contas de Clientes às Empresas
ALTER TABLE public.m4_client_accounts ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.m4_companies(id);
ALTER TABLE public.m4_client_accounts ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- 5. Vincular Tarefas às Empresas e Negócios
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.m4_companies(id);
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.m4_contacts(id);
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.m4_leads(id);
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS recurrence_type TEXT;
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS recurrence_days TEXT[];
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS recurrence_day_of_month INTEGER;
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS recurrence_month_week TEXT;
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS recurrence_occurrences INTEGER;

-- 6. Vincular Transações às Empresas e Negócios
ALTER TABLE public.m4_transactions ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.m4_companies(id);
ALTER TABLE public.m4_transactions ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.m4_leads(id);
ALTER TABLE public.m4_transactions ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- 7. Vincular E-mails às Empresas, Contatos e Negócios
ALTER TABLE public.m4_emails ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.m4_companies(id);
ALTER TABLE public.m4_emails ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.m4_contacts(id);
ALTER TABLE public.m4_emails ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.m4_leads(id);
ALTER TABLE public.m4_emails ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- 8. Adicionar workspace_id às tabelas restantes
ALTER TABLE m4_bank_accounts ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE m4_credit_cards ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE m4_posts ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE m4_campaigns ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE m4_settings ADD COLUMN IF NOT EXISTS workspace_id UUID;`;

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
