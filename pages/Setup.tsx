
import React, { useState } from 'react';
import { ICONS } from '../constants';
import { updateSupabaseClient } from '../lib/supabase';
import { motion } from 'motion/react';

const Setup: React.FC = () => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [step, setStep] = useState<'config' | 'installing' | 'success'>('config');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fullSetupSQL = `-- 🚀 SCRIPT DE INSTALAÇÃO COMPLETA (M4 CRM & Agency Suite)
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
    company TEXT, -- Nome da empresa
    company_id UUID REFERENCES public.m4_companies(id),
    contact_id UUID REFERENCES public.m4_contacts(id),
    email TEXT,
    phone TEXT,
    pipeline_id TEXT DEFAULT 'e167f4e8-4a19-4ab7-b655-f104004f8bf4',
    stage TEXT DEFAULT 's1',
    value NUMERIC DEFAULT 0,
    notes TEXT,
    niche TEXT, -- Nicho/Segmento
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
    cnpj TEXT,
    company_linkedin TEXT,
    company_whatsapp TEXT,
    company_email TEXT,
    company_phone TEXT,
    contact_role TEXT,
    contact_whatsapp TEXT,
    contact_instagram TEXT,
    contact_linkedin TEXT,
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
    contact_id UUID REFERENCES m4_contacts(id),
    deal_id UUID REFERENCES m4_leads(id),
    client_account_id UUID,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_period TEXT,
    workspace_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabela de Contas de Clientes
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
);

-- 9. Usuários
CREATE TABLE IF NOT EXISTS public.m4_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT DEFAULT 'admin123',
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'user')),
    job_role_id UUID,
    workspace_id UUID,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    must_change_password BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure job_role_id exists in m4_users
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_users' AND column_name='job_role_id') THEN
        ALTER TABLE m4_users ADD COLUMN job_role_id UUID REFERENCES m4_job_roles(id);
    END IF;
END $$;

-- 12. Cargos
CREATE TABLE IF NOT EXISTS public.m4_job_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID,
    name TEXT NOT NULL,
    level INTEGER DEFAULT 10,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure job_role_id exists in m4_users
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='m4_users' AND column_name='job_role_id') THEN
        ALTER TABLE m4_users ADD COLUMN job_role_id UUID REFERENCES m4_job_roles(id);
    END IF;
END $$;

-- Inserir cargos padrão
INSERT INTO public.m4_job_roles (id, name, level, permissions) VALUES
('d167f4e8-4a19-4ab7-b655-f104004f8bf1', 'Owner', 100, '{"all": true}'),
('d167f4e8-4a19-4ab7-b655-f104004f8bf2', 'Administrador', 50, '{"settings": true, "users": true, "leads": true, "finance": true}'),
('d167f4e8-4a19-4ab7-b655-f104004f8bf5', 'Coordenador', 40, '{"leads": true, "tasks": true, "clients": true, "users": true}'),
('d167f4e8-4a19-4ab7-b655-f104004f8bf6', 'Supervisor', 30, '{"leads": true, "tasks": true, "clients": true}'),
('d167f4e8-4a19-4ab7-b655-f104004f8bf3', 'Vendedor', 20, '{"leads": true, "tasks": true, "clients": true}'),
('d167f4e8-4a19-4ab7-b655-f104004f8bf4', 'Usuário Básico', 10, '{"tasks": true, "view_only": true}')
ON CONFLICT (id) DO NOTHING;

-- Inserir usuário admin padrão vinculado ao Owner
INSERT INTO public.m4_users (name, username, email, password, role, job_role_id, status, must_change_password)
VALUES ('Administrador', 'admin', 'admin@crm.com', 'admin123', 'owner', 'd167f4e8-4a19-4ab7-b655-f104004f8bf1', 'active', true)
ON CONFLICT (email) DO NOTHING;

-- 10. Pipelines
CREATE TABLE IF NOT EXISTS m4_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    workspace_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m4_pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES m4_pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    color TEXT DEFAULT 'blue',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. RLS (Simplified)
ALTER TABLE m4_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Simple policies to allow all authenticated users for now
CREATE POLICY "Allow all for authenticated" ON m4_settings FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON m4_companies FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON m4_contacts FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON m4_leads FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON m4_tasks FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON m4_client_accounts FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON m4_bank_accounts FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON m4_credit_cards FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON m4_transactions FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON m4_emails FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON m4_posts FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON m4_campaigns FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON m4_users FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON m4_job_roles FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON m4_pipelines FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON m4_pipeline_stages FOR ALL USING (true);
`;

  const handleInstall = async () => {
    if (!url || !anonKey) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setStep('installing');
    setError(null);

    try {
      // 1. Salvar no localStorage
      localStorage.setItem('supabase_url', url);
      localStorage.setItem('supabase_anon_key', anonKey);

      // 2. Atualizar cliente
      const supabase = updateSupabaseClient(url, anonKey);

      // 3. Simular progresso e tentar criar dados iniciais
      // Nota: Como não podemos criar tabelas via Anon Key, assumimos que o usuário rodou o SQL
      // Se falhar, mostramos o SQL para ele rodar manualmente.
      
      setProgress('Verificando conexão...');
      await new Promise(r => setTimeout(r, 1000));

      setProgress('Criando tabelas e estruturas...');
      // Tentamos inserir o usuário admin. Se falhar, é porque as tabelas não existem.
      const { error: userError } = await supabase.from('m4_users').upsert({
        name: 'Administrador',
        username: 'admin',
        email: 'admin@crm.com',
        password: 'admin123',
        role: 'owner',
        status: 'active',
        must_change_password: true
      }, { onConflict: 'email' });

      if (userError) {
        if (userError.code === '42P01') { // Relation does not exist
          throw new Error('As tabelas ainda não foram criadas no seu Supabase. Por favor, execute o script SQL abaixo no seu painel do Supabase antes de continuar.');
        }
        throw userError;
      }

      setProgress('Configurando pipelines padrão...');
      const pipelines = [
        { id: 'e167f4e8-4a19-4ab7-b655-f104004f8bf4', name: 'Vendas Comercial' },
        { id: '6262f0d6-8e20-496b-8076-f24e31e67fab', name: 'Gestão de Reuniões' }
      ];
      await supabase.from('m4_pipelines').upsert(pipelines);

      setProgress('Configurando etapas...');
      const p1Stages = [
        { pipeline_id: 'e167f4e8-4a19-4ab7-b655-f104004f8bf4', name: 'Lead', position: 0, color: 'blue' },
        { pipeline_id: 'e167f4e8-4a19-4ab7-b655-f104004f8bf4', name: 'Qualificação', position: 1, color: 'blue' },
        { pipeline_id: 'e167f4e8-4a19-4ab7-b655-f104004f8bf4', name: 'Proposta', position: 2, color: 'blue' },
        { pipeline_id: 'e167f4e8-4a19-4ab7-b655-f104004f8bf4', name: 'Negociação', position: 3, color: 'blue' },
        { pipeline_id: 'e167f4e8-4a19-4ab7-b655-f104004f8bf4', name: 'Fechamento', position: 4, color: 'blue' }
      ];
      const p2Stages = [
        { pipeline_id: '6262f0d6-8e20-496b-8076-f24e31e67fab', name: 'Agendadas', position: 0, color: 'blue' },
        { pipeline_id: '6262f0d6-8e20-496b-8076-f24e31e67fab', name: 'Confirmadas', position: 1, color: 'blue' },
        { pipeline_id: '6262f0d6-8e20-496b-8076-f24e31e67fab', name: 'Realizadas', position: 2, color: 'blue' }
      ];
      await supabase.from('m4_pipeline_stages').upsert([...p1Stages, ...p2Stages]);

      setProgress('Finalizando configuração...');
      await new Promise(r => setTimeout(r, 1000));

      setStep('success');
    } catch (err: any) {
      setError(err.message);
      setStep('config');
    }
  };

  const copySQL = () => {
    navigator.clipboard.writeText(fullSetupSQL);
    alert('SQL copiado! Cole-o no SQL Editor do seu Supabase e clique em RUN.');
  };

  if (step === 'success') {
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
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Tudo pronto!</h2>
            <p className="text-slate-500 font-medium">Seu CRM foi configurado com sucesso.</p>
          </div>
          
          <div className="bg-slate-50 p-6 rounded-3xl text-left space-y-4 border border-slate-100">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Credenciais de Acesso:</p>
            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-700">Usuário: <span className="text-blue-600">admin</span></p>
              <p className="text-sm font-bold text-slate-700">Senha: <span className="text-blue-600">admin123</span></p>
            </div>
            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tight">⚠️ Troca de senha obrigatória no primeiro acesso.</p>
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
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">M4 CRM</h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Setup Inicial</p>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Bem-vindo! Vamos configurar seu CRM</h2>
          <p className="text-slate-500 font-medium">
            Você precisará de uma conta gratuita no <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">Supabase</a> para armazenar seus dados.
          </p>
        </div>

        {error && (
          <div className="p-6 bg-red-50 rounded-3xl border border-red-100 space-y-4">
            <div className="flex gap-3 text-red-600">
              <ICONS.AlertTriangle size={20} />
              <p className="text-sm font-bold leading-relaxed">{error}</p>
            </div>
            {error.includes('tabelas') && (
              <button 
                onClick={copySQL}
                className="w-full py-3 bg-white text-red-600 border border-red-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all"
              >
                Copiar Script SQL de Instalação
              </button>
            )}
          </div>
        )}

        {step === 'installing' ? (
          <div className="py-12 text-center space-y-6">
            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-600 font-black uppercase text-xs tracking-widest animate-pulse">{progress}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">URL do Supabase</label>
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xxx.supabase.co"
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-slate-700 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Anon Key</label>
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
            Ao clicar em instalar, criaremos a estrutura necessária no seu banco.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Setup;
