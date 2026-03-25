-- Allow update on m4_leads for authenticated users
CREATE POLICY "Allow update on m4_leads" ON public.m4_leads
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
