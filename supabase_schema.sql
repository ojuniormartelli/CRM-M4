-- SQL Migration Script for M4 CRM & Agency Suite
-- Run this in your Supabase SQL Editor

-- 1. Create Settings table
CREATE TABLE IF NOT EXISTS m4_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT UNIQUE, -- One settings record per tenant/workspace
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

-- 2. Add missing columns to m4_leads for enhanced CRM features
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS niche TEXT;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS proposed_ticket NUMERIC DEFAULT 0;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS next_action TEXT;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS next_action_date DATE;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS qualification TEXT;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS campaign TEXT;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS closing_forecast DATE;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS temperature TEXT DEFAULT 'Frio';
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS probability INTEGER DEFAULT 0;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS ai_score INTEGER DEFAULT 0;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS company_email TEXT;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS company_phone TEXT;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]';
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS responsible_name TEXT;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS responsible_id TEXT;
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS interactions JSONB DEFAULT '[]';
ALTER TABLE m4_leads ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- 3. Ensure other tables exist (Basic structure)
CREATE TABLE IF NOT EXISTS m4_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Pendente',
    priority TEXT DEFAULT 'Média',
    type TEXT DEFAULT 'task',
    due_date TIMESTAMP WITH TIME ZONE,
    lead_id UUID REFERENCES m4_leads(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m4_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL, -- income / expense
    category TEXT,
    date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'Pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m4_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_name TEXT,
    sender_email TEXT,
    recipient_email TEXT,
    subject TEXT,
    body TEXT,
    folder TEXT DEFAULT 'inbox',
    is_read BOOLEAN DEFAULT FALSE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS (Optional but recommended)
-- ALTER TABLE m4_settings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE m4_leads ENABLE ROW LEVEL SECURITY;
-- ... add policies as needed
