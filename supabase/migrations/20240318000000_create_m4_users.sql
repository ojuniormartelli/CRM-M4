-- Create m4_users table for user profiles
CREATE TABLE IF NOT EXISTS public.m4_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'user')),
    workspace_id UUID,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.m4_users ENABLE ROW LEVEL SECURITY;

-- Policies for m4_users
-- Users can read all users in their workspace (for Agência mode)
-- For now, let's allow all authenticated users to read m4_users to simplify
CREATE POLICY "Allow authenticated read access" ON public.m4_users
    FOR SELECT USING (auth.role() = 'authenticated');

-- Users can update their own profile
CREATE POLICY "Allow users to update their own profile" ON public.m4_users
    FOR UPDATE USING (auth.uid() = auth_user_id);

-- Admins/Owners can update any user (simplified for now)
CREATE POLICY "Allow admins to update any user" ON public.m4_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.m4_users
            WHERE auth_user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_m4_users_updated_at
    BEFORE UPDATE ON public.m4_users
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
