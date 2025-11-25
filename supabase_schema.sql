-- Create user_editors table
create table if not exists public.user_editors (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  name text not null,
  is_active boolean default true,
  last_login timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Enable RLS on user_editors
alter table public.user_editors enable row level security;

-- Create policy to allow public read access (or restrict as needed)
create policy "Allow public read access" on public.user_editors for select using (true);

-- Create edit_history table
create table if not exists public.edit_history (
  id uuid default gen_random_uuid() primary key,
  editor_id uuid references public.user_editors(id),
  editor_email text,
  editor_name text,
  edit_type text,
  target_type text,
  target_id text,
  file_path text,
  content_before text,
  content_after text,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- Enable RLS on edit_history
alter table public.edit_history enable row level security;

-- Create policy to allow public insert access (since we handle auth via the function/context)
-- Ideally this should be more restricted, but for this simple auth implementation:
create policy "Allow public insert" on public.edit_history for insert with check (true);
create policy "Allow public select" on public.edit_history for select using (true);

-- Create function to get or create editor
create or replace function public.get_or_create_editor(p_email text, p_name text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_editor_id uuid;
begin
  -- Check if editor exists
  select id into v_editor_id
  from public.user_editors
  where email = p_email;

  -- If exists, update last_login and return id
  if found then
    update public.user_editors
    set last_login = now(),
        name = p_name -- Update name in case it changed
    where id = v_editor_id;
    return v_editor_id;
  end if;

  -- If not exists, create new editor
  insert into public.user_editors (email, name)
  values (p_email, p_name)
  returning id into v_editor_id;

  return v_editor_id;
end;
$$;
