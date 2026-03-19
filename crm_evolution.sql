-- 🔄 SCRIPT DE ATUALIZAÇÃO (M4 CRM - CRM Evolution)
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

-- 5. Vincular Tarefas às Empresas e Negócios
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.m4_companies(id);
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.m4_leads(id);
ALTER TABLE public.m4_tasks ADD COLUMN IF NOT EXISTS workspace_id uuid;

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
ALTER TABLE m4_client_accounts ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE m4_bank_accounts ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE m4_credit_cards ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE m4_posts ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE m4_campaigns ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE m4_settings ADD COLUMN IF NOT EXISTS workspace_id UUID;
