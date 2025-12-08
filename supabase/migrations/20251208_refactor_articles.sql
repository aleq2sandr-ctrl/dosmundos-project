-- Enable UUID extension if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Category Translations Table
CREATE TABLE IF NOT EXISTS category_translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    language_code TEXT NOT NULL, -- 'en', 'ru', 'es'
    name TEXT NOT NULL,
    UNIQUE(category_id, language_code)
);

-- Articles Table (Core Data)
CREATE TABLE IF NOT EXISTS articles_v2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    author TEXT,
    youtube_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Article Translations Table
CREATE TABLE IF NOT EXISTS article_translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID REFERENCES articles_v2(id) ON DELETE CASCADE,
    language_code TEXT NOT NULL,
    title TEXT,
    summary TEXT,
    content TEXT, -- HTML content
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(article_id, language_code)
);

-- Article Categories Junction Table
CREATE TABLE IF NOT EXISTS article_categories (
    article_id UUID REFERENCES articles_v2(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, category_id)
);

-- RLS Policies (Enable RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_categories ENABLE ROW LEVEL SECURITY;

-- Public Read Access
CREATE POLICY "Public categories are viewable by everyone" ON categories FOR SELECT USING (true);
CREATE POLICY "Public category translations are viewable by everyone" ON category_translations FOR SELECT USING (true);
CREATE POLICY "Public articles are viewable by everyone" ON articles_v2 FOR SELECT USING (true);
CREATE POLICY "Public article translations are viewable by everyone" ON article_translations FOR SELECT USING (true);
CREATE POLICY "Public article categories are viewable by everyone" ON article_categories FOR SELECT USING (true);
