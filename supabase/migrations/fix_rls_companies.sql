-- Desabilitar RLS temporariamente ou adicionar política aberta
ALTER TABLE m4_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all select on companies" ON m4_companies;
CREATE POLICY "Allow all select on companies" ON m4_companies FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all insert on companies" ON m4_companies;
CREATE POLICY "Allow all insert on companies" ON m4_companies FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all update on companies" ON m4_companies;
CREATE POLICY "Allow all update on companies" ON m4_companies FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow all delete on companies" ON m4_companies;
CREATE POLICY "Allow all delete on companies" ON m4_companies FOR DELETE USING (true);
