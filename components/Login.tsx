import React, { useState } from 'react';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mustChangePasswordUser, setMustChangePasswordUser] = useState<User | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Convert username to internal email
      const internalEmail = username.includes('@') ? username : `${username}@crm.com`;

      // Simple check against m4_users for "admin/admin" or other users
      const { data, error: fetchError } = await supabase
        .from('m4_users')
        .select('*')
        .eq('email', internalEmail)
        .eq('password', password)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        if (data.must_change_password) {
          setMustChangePasswordUser(data);
        } else {
          // Store session locally for this session
          localStorage.setItem('m4_crm_user_id', data.id);
          onLogin(data);
        }
      } else {
        setError('Usuário ou senha inválidos.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Erro ao realizar login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (mustChangePasswordUser) {
    return (
      <ForcePasswordChange 
        user={mustChangePasswordUser} 
        onSuccess={(updatedUser) => {
          localStorage.setItem('m4_crm_user_id', updatedUser.id);
          onLogin(updatedUser);
        }} 
      />
    );
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-12 space-y-8 animate-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-indigo-100 dark:shadow-none">
            <ICONS.Sales size={32} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">M4 CRM</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Acesso Restrito</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Usuário</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200"
                required
              />
            </div>
            <div className="relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Senha</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? <ICONS.EyeOff size={20} /> : <ICONS.Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest text-center">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transition-all disabled:opacity-50 active:scale-95"
          >
            {loading ? 'AUTENTICANDO...' : 'ENTRAR NO SISTEMA'}
          </button>
        </form>

        <div className="text-center space-y-4">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
            M4 Marketing Digital – CRM & Agency Suite
          </p>
          
          {localStorage.getItem('supabase_url') && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
              <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Acesso Padrão:</p>
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mt-1">admin / admin123</p>
            </div>
          )}

          <InstallationAccordion />
        </div>
      </div>
    </div>
  );
};

const ForcePasswordChange: React.FC<{ user: User; onSuccess: (user: User) => void }> = ({ user, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({ new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from('m4_users')
        .update({ 
          password: newPassword,
          must_change_password: false 
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      onSuccess(data);
    } catch (err: any) {
      console.error('Password change error:', err);
      setError('Erro ao alterar senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-12 space-y-8 animate-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-amber-500 text-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-amber-100 dark:shadow-none">
            <ICONS.Lock size={32} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Troca de Senha</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Por segurança, defina uma nova senha</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Nova Senha</label>
              <div className="relative">
                <input 
                  type={showPasswords.new ? "text" : "password"} 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {showPasswords.new ? <ICONS.EyeOff size={20} /> : <ICONS.Eye size={20} />}
                </button>
              </div>
            </div>
            <div className="relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Confirmar Nova Senha</label>
              <div className="relative">
                <input 
                  type={showPasswords.confirm ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {showPasswords.confirm ? <ICONS.EyeOff size={20} /> : <ICONS.Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest text-center">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transition-all disabled:opacity-50 active:scale-95"
          >
            {loading ? 'SALVANDO...' : 'SALVAR E CONTINUAR'}
          </button>
        </form>
      </div>
    </div>
  );
};

const InstallationAccordion: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

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
    company_name TEXT, -- Nome da empresa
    company_id UUID REFERENCES public.m4_companies(id),
    contact_id UUID REFERENCES public.m4_contacts(id),
    email TEXT,
    phone TEXT,
    pipeline_id TEXT DEFAULT 'e167f4e8-4a19-4ab7-b655-f104004f8bf4',
    stage TEXT DEFAULT 's1',
    value NUMERIC DEFAULT 0,
    notes TEXT,
    segment TEXT, -- Nicho/Segmento
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
    company_instagram TEXT,
    website TEXT,
    company_cnpj TEXT,
    company_linkedin TEXT,
    company_whatsapp TEXT,
    company_email TEXT,
    company_phone TEXT,
    contact_name TEXT,
    contact_role TEXT,
    contact_email TEXT,
    contact_phone TEXT,
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
    status TEXT DEFAULT 'intermediario',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Seed Data
INSERT INTO m4_pipelines (id, name)
VALUES 
  ('e167f4e8-4a19-4ab7-b655-f104004f8bf4', 'Vendas Comercial'),
  ('6262f0d6-8e20-496b-8076-f24e31e67fab', 'Gestão de Reuniões')
ON CONFLICT (id) DO NOTHING;

INSERT INTO m4_pipeline_stages (pipeline_id, name, position, color)
VALUES 
  ('e167f4e8-4a19-4ab7-b655-f104004f8bf4', 'Lead', 0, 'blue'),
  ('e167f4e8-4a19-4ab7-b655-f104004f8bf4', 'Qualificação', 1, 'blue'),
  ('e167f4e8-4a19-4ab7-b655-f104004f8bf4', 'Proposta', 2, 'blue'),
  ('e167f4e8-4a19-4ab7-b655-f104004f8bf4', 'Negociação', 3, 'blue'),
  ('e167f4e8-4a19-4ab7-b655-f104004f8bf4', 'Fechamento', 4, 'blue'),
  ('6262f0d6-8e20-496b-8076-f24e31e67fab', 'Agendadas', 0, 'blue'),
  ('6262f0d6-8e20-496b-8076-f24e31e67fab', 'Confirmadas', 1, 'blue'),
  ('6262f0d6-8e20-496b-8076-f24e31e67fab', 'Realizadas', 2, 'blue')
ON CONFLICT DO NOTHING;

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

  const copySQL = () => {
    navigator.clipboard.writeText(fullSetupSQL);
    alert('SQL de Instalação copiado! Cole no SQL Editor do Supabase.');
  };

  return (
    <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest flex items-center justify-center gap-2 mx-auto"
      >
        🛠️ Primeira instalação? Clique aqui
      </button>

      {isOpen && (
        <div className="mt-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 text-left space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="space-y-1">
            <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">INSTALAÇÃO INICIAL DO BANCO DE DADOS</h3>
            <p className="text-[9px] font-medium text-slate-500 leading-relaxed">
              Execute este script no SQL Editor do seu Supabase para configurar todas as tabelas necessárias.
            </p>
          </div>

          <button 
            onClick={copySQL}
            className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
          >
            Copiar SQL de Instalação
          </button>

          <div className="space-y-2">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Instruções:</p>
            <ol className="text-[9px] font-bold text-slate-600 dark:text-slate-400 space-y-1">
              <li>1. Copie o SQL acima</li>
              <li>2. Acesse seu projeto no Supabase</li>
              <li>3. Abra SQL Editor</li>
              <li>4. Cole e execute</li>
              <li>5. Volte aqui e faça login com <span className="text-indigo-600">admin / admin123</span></li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
