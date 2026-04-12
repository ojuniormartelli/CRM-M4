-- 🛠️ FIX: Adiciona ON DELETE CASCADE para referências de leads que estavam faltando
-- Isso resolve problemas ao excluir leads que possuem e-mails ou transações vinculadas.

-- 1. m4_transactions
ALTER TABLE m4_transactions DROP CONSTRAINT IF EXISTS m4_transactions_lead_id_fkey;
ALTER TABLE m4_transactions ADD CONSTRAINT m4_transactions_lead_id_fkey 
    FOREIGN KEY (lead_id) REFERENCES m4_leads(id) ON DELETE CASCADE;

-- 2. m4_emails
ALTER TABLE m4_emails DROP CONSTRAINT IF EXISTS m4_emails_lead_id_fkey;
ALTER TABLE m4_emails ADD CONSTRAINT m4_emails_lead_id_fkey 
    FOREIGN KEY (lead_id) REFERENCES m4_leads(id) ON DELETE CASCADE;

-- 3. m4_tasks (deal_id)
ALTER TABLE m4_tasks DROP CONSTRAINT IF EXISTS m4_tasks_deal_id_fkey;
ALTER TABLE m4_tasks ADD CONSTRAINT m4_tasks_deal_id_fkey 
    FOREIGN KEY (deal_id) REFERENCES m4_leads(id) ON DELETE CASCADE;
