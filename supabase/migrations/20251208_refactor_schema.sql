-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. New Articles Table (Language agnostic)
create table if not exists public.articles_v2 (
    id uuid primary key default uuid_generate_v4(),
    slug text unique not null,
    author text,
    youtube_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 2. Article Translations Table
create table if not exists public.article_translations (
    id uuid primary key default uuid_generate_v4(),
    article_id uuid references public.articles_v2(id) on delete cascade,
    language_code text not null, -- 'ru', 'en', 'es'
    title text,
    summary text,
    content text,
    created_at timestamptz default now(),
    unique(article_id, language_code)
);

-- 3. Categories Table
create table if not exists public.categories (
    id uuid primary key default uuid_generate_v4(),
    slug text unique not null,
    created_at timestamptz default now()
);

-- 4. Category Translations Table
create table if not exists public.category_translations (
    id uuid primary key default uuid_generate_v4(),
    category_id uuid references public.categories(id) on delete cascade,
    language_code text not null,
    name text not null,
    unique(category_id, language_code)
);

-- 5. Article Categories Junction Table
create table if not exists public.article_categories (
    article_id uuid references public.articles_v2(id) on delete cascade,
    category_id uuid references public.categories(id) on delete cascade,
    primary key (article_id, category_id)
);

-- Enable RLS
alter table public.articles_v2 enable row level security;
alter table public.article_translations enable row level security;
alter table public.categories enable row level security;
alter table public.category_translations enable row level security;
alter table public.article_categories enable row level security;

-- Create Policies (Public Read Access)
create policy "Public articles_v2 are viewable by everyone" on public.articles_v2 for select using (true);
create policy "Public article_translations are viewable by everyone" on public.article_translations for select using (true);
create policy "Public categories are viewable by everyone" on public.categories for select using (true);
create policy "Public category_translations are viewable by everyone" on public.category_translations for select using (true);
create policy "Public article_categories are viewable by everyone" on public.article_categories for select using (true);

-- Create Policies (Service Role Full Access - implicit, but good to be explicit if needed, usually service role bypasses RLS)
