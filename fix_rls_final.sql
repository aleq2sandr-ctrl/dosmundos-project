-- 1. Ensure RLS is enabled
ALTER TABLE public.user_editors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edit_history ENABLE ROW LEVEL SECURITY;

-- 2. Grant table permissions to API roles
GRANT ALL ON public.user_editors TO anon;
GRANT ALL ON public.user_editors TO authenticated;
GRANT ALL ON public.user_editors TO service_role;

GRANT ALL ON public.edit_history TO anon;
GRANT ALL ON public.edit_history TO authenticated;
GRANT ALL ON public.edit_history TO service_role;

-- 3. Drop ALL existing policies to avoid conflicts and confusion
DROP POLICY IF EXISTS "Allow public read access" ON public.user_editors;
DROP POLICY IF EXISTS "Allow public insert" ON public.user_editors;
DROP POLICY IF EXISTS "Allow public update" ON public.user_editors;
DROP POLICY IF EXISTS "Allow all for public" ON public.user_editors;

DROP POLICY IF EXISTS "Allow public insert" ON public.edit_history;
DROP POLICY IF EXISTS "Allow public select" ON public.edit_history;
DROP POLICY IF EXISTS "Allow all for public" ON public.edit_history;

-- 4. Create simple, permissive policies for ALL operations
-- This allows Select, Insert, Update, Delete for everyone
CREATE POLICY "Allow all for public"
ON public.user_editors
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for public"
ON public.edit_history
FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Reload schema cache
NOTIFY pgrst, 'reload config';
