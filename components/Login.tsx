
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
          // Store session locally
          localStorage.setItem('m4_crm_user_id', data.id);
          if (data.workspace_id) {
            localStorage.setItem('m4_crm_workspace_id', data.workspace_id);
          }
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
          if (updatedUser.workspace_id) {
            localStorage.setItem('m4_crm_workspace_id', updatedUser.workspace_id);
          }
          onLogin(updatedUser);
        }} 
      />
    );
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-12 space-y-8 animate-zoom-in-95">
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
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-12 space-y-8 animate-zoom-in-95">
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
-- ⚠️ AVISO: Este script apaga todas as tabelas existentes para uma instalação limpa.

-- 1. LIMPEZA TOTAL (Tabelas com prefixo m4_)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'm4_%') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
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

-- 3. NÚCLEO TENANT (Workspaces)
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
    id UUID PRIMARY KEY,
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT DEFAULT 'admin123',
    role TEXT DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'user')),
    job_role_id UUID REFERENCES public.m4_job_roles(id) ON DELETE SET NULL,
    avatar_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    must_change_password BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_workspace_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.m4_users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, user_id)
);

CREATE TABLE public.m4_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE UNIQUE,
    crm_name TEXT DEFAULT 'M4 CRM',
    company_name TEXT DEFAULT 'Agency Cloud',
    logo_url TEXT,
    primary_color TEXT DEFAULT '#2563eb',
    theme TEXT DEFAULT 'light',
    language TEXT DEFAULT 'pt-BR',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CRM E OPERAÇÕES
CREATE TABLE public.m4_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES public.m4_pipelines(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT 'blue',
    position INTEGER DEFAULT 0,
    status TEXT DEFAULT 'intermediario',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cnpj TEXT,
    website TEXT,
    niche TEXT,
    email TEXT,
    whatsapp TEXT,
    city TEXT,
    state TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE public.m4_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.m4_companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    email TEXT,
    whatsapp TEXT, LinkedIn TEXT,
    notes TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    pipeline_id UUID REFERENCES public.m4_pipelines(id) ON DELETE SET NULL,
    stage_id UUID REFERENCES public.m4_pipeline_stages(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.m4_companies(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.m4_contacts(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active',
    company_name TEXT,
    contact_name TEXT,
    value DECIMAL(12, 2) DEFAULT 0,
    business_notes TEXT,
    service_type TEXT,
    proposed_ticket DECIMAL(12, 2) DEFAULT 0,
    temperature TEXT DEFAULT 'Frio',
    probability INTEGER DEFAULT 0,
    source TEXT,
    campaign TEXT,
    closing_forecast DATE,
    next_action TEXT,
    next_action_date DATE,
    qualification TEXT,
    ai_score INTEGER DEFAULT 0,
    ai_reasoning TEXT,
    responsible_id UUID,
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    custom_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE public.m4_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.m4_leads(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.m4_companies(id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    manager_id UUID,
    status TEXT DEFAULT 'active',
    contract_start_date DATE,
    monthly_value DECIMAL(12, 2) DEFAULT 0,
    services JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.m4_leads(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.m4_clients(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Pendente',
    priority TEXT DEFAULT 'Média',
    due_date TIMESTAMPTZ,
    assigned_to UUID,
    type TEXT DEFAULT 'task',
    is_recurring BOOLEAN DEFAULT false,
    checklist JSONB DEFAULT '[]'::jsonb,
    actual_hours DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. FINANCEIRO NOVO (m4_fin_*)
CREATE TABLE public.m4_fin_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type fin_category_type NOT NULL DEFAULT 'both',
    parent_id UUID REFERENCES public.m4_fin_categories(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    "order" INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    impacts_dre BOOLEAN DEFAULT true,
    dre_group TEXT,
    classification_type fin_classification_type DEFAULT 'operacional',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_fin_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bank TEXT,
    type fin_bank_account_type DEFAULT 'checking',
    initial_balance NUMERIC DEFAULT 0,
    initial_balance_date DATE DEFAULT CURRENT_DATE,
    color TEXT,
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    currency TEXT DEFAULT 'BRL',
    balance NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.m4_fin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.m4_workspaces(id) ON DELETE CASCADE,
    type fin_transaction_type NOT NULL,
    status fin_transaction_status DEFAULT 'pending',
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    competence_date DATE NOT NULL,
    bank_account_id UUID REFERENCES public.m4_fin_bank_accounts(id) ON DELETE SET NULL,
    destination_bank_account_id UUID REFERENCES public.m4_fin_bank_accounts(id) ON DELETE SET NULL,
    counterparty_id UUID,
    category_id UUID REFERENCES public.m4_fin_categories(id) ON DELETE SET NULL,
    cost_center_id UUID,
    payment_method TEXT,
    reference_code TEXT,
    notes TEXT,
    attachment_url TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_group_id UUID,
    recurrence_frequency TEXT,
    recurrence_interval INTEGER DEFAULT 1,
    recurrence_end_date DATE,
    parent_transaction_id UUID REFERENCES public.m4_fin_transactions(id) ON DELETE SET NULL,
    generation_mode TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. SEEDS INICIAIS
INSERT INTO public.m4_workspaces (id, name)
VALUES ('fb786658-1234-4321-8888-999988887777', 'Workspace Principal')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.m4_job_roles (id, workspace_id, name, level, permissions)
VALUES ('d167f4e8-4a19-4ab7-b655-f104004f8bf1', 'fb786658-1234-4321-8888-999988887777', 'Owner', 100, '{"all": true}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.m4_users (id, name, email, password, role, job_role_id, workspace_id, status, must_change_password)
VALUES ('d167f4e8-4a19-4ab7-b655-f104004f8bf0', 'Administrador', 'admin@crm.com', 'admin123', 'owner', 'd167f4e8-4a19-4ab7-b655-f104004f8bf1', 'fb786658-1234-4321-8888-999988887777', 'active', true)
ON CONFLICT (id) DO NOTHING;

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

-- 7. PERMISSÕES
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
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
