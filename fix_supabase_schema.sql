-- 1. Grant execute permissions to ensure the API can call the function
GRANT EXECUTE ON FUNCTION public.get_or_create_editor(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_editor(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_editor(text, text) TO service_role;

-- 2. Force PostgREST to reload the schema cache
-- This fixes the "Could not find the function ... in the schema cache" error
NOTIFY pgrst, 'reload config';
