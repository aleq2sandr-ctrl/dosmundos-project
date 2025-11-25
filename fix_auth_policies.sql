-- Enable insert and update for user_editors to allow client-side upsert
-- This replaces the need for the RPC function which is causing issues

-- Drop existing policies if they conflict (optional, but good for safety)
drop policy if exists "Allow public insert" on public.user_editors;
drop policy if exists "Allow public update" on public.user_editors;

-- Create policies
create policy "Allow public insert" on public.user_editors for insert with check (true);
create policy "Allow public update" on public.user_editors for update using (true);

-- Ensure the table exists and has the correct constraints
create table if not exists public.user_editors (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  name text not null,
  is_active boolean default true,
  last_login timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Force schema cache reload just in case
NOTIFY pgrst, 'reload config';
