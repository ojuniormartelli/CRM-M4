-- 🚀 SCRIPT DE INSTALAÇÃO COMPLETA (M4 CRM & Agency Suite)
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
  email text,
  instagram text,
  linkedin text,
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
    
    -- Prospect Company Data
    company_name TEXT NOT NULL,
    company_cnpj TEXT,
    company_city TEXT,
    company_state TEXT,
    company_niche TEXT,
    company_website TEXT,
    company_email TEXT,
    company_instagram TEXT,
    company_linkedin TEXT,
    company_phone TEXT,
    
    -- Contact / Decision Maker Data
    contact_name TEXT NOT NULL,
    contact_role TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    contact_instagram TEXT,
    contact_linkedin TEXT,
    contact_notes TEXT,
    
    -- Business Data
    pipeline_id TEXT DEFAULT 'e167f4e8-4a19-4ab7-b655-f104004f8bf4',
    stage TEXT DEFAULT 's1',
    value NUMERIC DEFAULT 0,
    business_notes TEXT,
    service_type TEXT,
    proposed_ticket NUMERIC DEFAULT 0,
    next_action TEXT,
    next_action_date DATE,
    qualification TEXT,
    source TEXT,
    campaign TEXT,
    closing_forecast DATE,
    temperature TEXT DEFAULT 'Frio',
    probability INTEGER DEFAULT 0,
    ai_score INTEGER DEFAULT 0,
    ai_reasoning TEXT,
    
    -- Metadata & System
    responsible_name TEXT,
    responsible_id TEXT,
    company_id UUID REFERENCES public.m4_companies(id),
    contact_id UUID REFERENCES public.m4_contacts(id),
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
    client_account_id UUID, -- Será referenciado abaixo
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_period TEXT,
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

-- Adicionar FK em m4_tasks para m4_client_accounts
ALTER TABLE m4_tasks ADD CONSTRAINT fk_client_account FOREIGN KEY (client_account_id) REFERENCES m4_client_accounts(id);

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

-- 10. Pipelines e Etapas
CREATE TABLE IF NOT EXISTS m4_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    workspace_id UUID,
    position INTEGER DEFAULT 0,
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

-- 11. Cargos
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
