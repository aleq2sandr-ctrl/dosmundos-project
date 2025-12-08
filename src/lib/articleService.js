import { supabase } from './supabaseClient';

export const articleService = {
  async getArticles(lang, start = 0, end = 999) {
    // Try fetching from the new v2 structure
    try {
      const { data, error } = await supabase
        .from('articles_v2')
        .select(`
          id,
          slug,
          author,
          youtube_url,
          created_at,
          article_translations!inner (
            title,
            summary
          ),
          article_categories (
            categories (
              slug,
              category_translations (
                name,
                language_code
              )
            )
          )
        `)
        .eq('article_translations.language_code', lang)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) {
        // If table doesn't exist (migration not run), fall back to old table
        if (error.code === '42P01') { // undefined_table
          console.warn('articles_v2 table not found, falling back to v1');
          return this.getArticlesV1(lang);
        }
        throw error;
      }

      // Transform data
      return data.map(article => ({
        id: article.slug, // Keep using slug as ID for frontend routing
        title: article.article_translations[0]?.title,
        summary: article.article_translations[0]?.summary,
        author: article.author,
        youtubeUrl: article.youtube_url,
        categories: article.article_categories.map(ac => {
          const translation = ac.categories.category_translations.find(
            ct => ct.language_code === lang
          );
          return translation ? translation.name : ac.categories.slug;
        })
      }));

    } catch (error) {
      console.error('Error fetching articles:', error);
      return [];
    }
  },

  async getArticle(slug, lang) {
    try {
      const { data, error } = await supabase
        .from('articles_v2')
        .select(`
          id,
          slug,
          author,
          youtube_url,
          created_at,
          article_translations!inner (
            title,
            summary,
            content
          ),
          article_categories (
            categories (
              slug,
              category_translations (
                name,
                language_code
              )
            )
          )
        `)
        .eq('slug', slug)
        .eq('article_translations.language_code', lang)
        .single();

      if (error) {
        if (error.code === '42P01') {
          return this.getArticleV1(slug, lang);
        }
        throw error;
      }

      if (!data) return null;

      return {
        id: data.slug,
        title: data.article_translations[0]?.title,
        summary: data.article_translations[0]?.summary,
        content: data.article_translations[0]?.content,
        author: data.author,
        youtubeUrl: data.youtube_url,
        categories: data.article_categories.map(ac => {
          const translation = ac.categories.category_translations.find(
            ct => ct.language_code === lang
          );
          return translation ? translation.name : ac.categories.slug;
        })
      };

    } catch (error) {
      console.error('Error fetching article:', error);
      return null;
    }
  },

  // Fallback for V1 (Old Structure)
  async getArticlesV1(lang) {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(article => ({
      id: article.slug,
      title: article.title?.[lang] || article.title?.['en'],
      summary: article.summary?.[lang] || article.summary?.['en'],
      categories: article.categories || [],
      author: article.author,
      youtubeUrl: article.youtube_url
    }));
  },

  async getArticleV1(slug, lang) {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.slug,
      title: data.title?.[lang] || data.title?.['en'],
      summary: data.summary?.[lang] || data.summary?.['en'],
      content: data.content?.[lang] || data.content?.['en'],
      categories: data.categories || [],
      author: data.author,
      youtubeUrl: data.youtube_url
    };
  }
};
