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
