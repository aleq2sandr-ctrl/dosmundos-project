-- 1. Reset Schema
-- Create user_editors table
CREATE TABLE IF NOT EXISTS public.user_editors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create edit_history table with all needed columns
CREATE TABLE IF NOT EXISTS public.edit_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    editor_id UUID REFERENCES public.user_editors(id),
    editor_email TEXT,
    editor_name TEXT,
    edit_type TEXT,
    target_type TEXT,
    target_id TEXT,
    file_path TEXT,
    content_before TEXT,
    content_after TEXT,
    metadata JSONB,
    is_rolled_back BOOLEAN DEFAULT false,
    rolled_back_at TIMESTAMP WITH TIME ZONE,
    rolled_back_by TEXT,
    rollback_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add columns if they don't exist (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'edit_history' AND column_name = 'is_rolled_back') THEN
        ALTER TABLE public.edit_history ADD COLUMN is_rolled_back BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'edit_history' AND column_name = 'rolled_back_at') THEN
        ALTER TABLE public.edit_history ADD COLUMN rolled_back_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'edit_history' AND column_name = 'rolled_back_by') THEN
        ALTER TABLE public.edit_history ADD COLUMN rolled_back_by TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'edit_history' AND column_name = 'rollback_reason') THEN
        ALTER TABLE public.edit_history ADD COLUMN rollback_reason TEXT;
    END IF;
END $$;

-- Create view edit_history_with_editor
CREATE OR REPLACE VIEW public.edit_history_with_editor AS
SELECT * FROM public.edit_history;

-- 2. Reset RLS
ALTER TABLE public.user_editors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edit_history ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow public read access" ON public.user_editors;
DROP POLICY IF EXISTS "Allow public insert" ON public.user_editors;
DROP POLICY IF EXISTS "Allow public update" ON public.user_editors;
DROP POLICY IF EXISTS "Allow all for public" ON public.user_editors;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_editors;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.user_editors;
DROP POLICY IF EXISTS "Enable update for all users" ON public.user_editors;
DROP POLICY IF EXISTS "Allow all operations" ON public.user_editors;

DROP POLICY IF EXISTS "Allow public insert" ON public.edit_history;
DROP POLICY IF EXISTS "Allow public select" ON public.edit_history;
DROP POLICY IF EXISTS "Allow all for public" ON public.edit_history;
DROP POLICY IF EXISTS "Allow all operations" ON public.edit_history;

-- Create permissive policies
CREATE POLICY "Allow all operations" ON public.user_editors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.edit_history FOR ALL USING (true) WITH CHECK (true);

-- 3. Grant Permissions
GRANT ALL ON public.user_editors TO anon, authenticated, service_role;
GRANT ALL ON public.edit_history TO anon, authenticated, service_role;
GRANT ALL ON public.edit_history_with_editor TO anon, authenticated, service_role;

-- 4. Create rollback_edit function
CREATE OR REPLACE FUNCTION public.rollback_edit(p_edit_id UUID, p_rolled_back_by_email TEXT, p_rollback_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_edit_record RECORD;
BEGIN
    -- Check if edit exists
    SELECT * INTO v_edit_record FROM public.edit_history WHERE id = p_edit_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Edit not found');
    END IF;

    -- Update edit record
    UPDATE public.edit_history
    SET is_rolled_back = true,
        rolled_back_at = now(),
        rolled_back_by = p_rolled_back_by_email,
        rollback_reason = p_rollback_reason
    WHERE id = p_edit_id
    RETURNING * INTO v_edit_record;

    RETURN jsonb_build_object('success', true, 'data', row_to_json(v_edit_record));
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rollback_edit(UUID, TEXT, TEXT) TO anon, authenticated, service_role;

-- 5. Reload Config
NOTIFY pgrst, 'reload config';
