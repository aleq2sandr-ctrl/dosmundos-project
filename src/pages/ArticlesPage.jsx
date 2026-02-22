import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getLocaleString } from '@/lib/locales';
import { supabase } from '@/lib/supabaseClient';
import { Search, Loader2 } from 'lucide-react';
import { calculateReadingTime } from '@/lib/utils';
import ArticleCardSkeleton from '@/components/ArticleCardSkeleton';
import ArticleCard from '@/components/ArticleCard';
import { updateArticlesListMetaTags, resetMetaTags } from '@/lib/updateMetaTags';

const ArticlesPage = () => {
  const { lang } = useParams();
  const [rawArticles, setRawArticles] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(6);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Track current lang to prevent stale fetches from corrupting state
  const currentLangRef = useRef(lang);

  // SEO: Update meta tags for articles list page
  useEffect(() => {
    updateArticlesListMetaTags(lang || 'ru');
    return () => resetMetaTags();
  }, [lang]);

  // Infinite scroll observer with debounce
  const observer = useRef();
  const debounceTimer = useRef();
  const lastArticleElementRef = useCallback(node => {
    if (isInitialLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
          setVisibleCount(prev => prev + 6);
        }, 300);
      }
    });
    if (node) observer.current.observe(node);
  }, [isInitialLoading, loadingMore, hasMore]);

  // When language changes, reset offset to 0 to trigger a fresh fetch
  useEffect(() => {
    if (currentLangRef.current !== lang) {
      currentLangRef.current = lang;
      setOffset(0);
      setHasMore(true);
      setVisibleCount(6);
      setSelectedCategory('All');
    }
  }, [lang]);

  // Unified fetch effect — handles both initial load and pagination
  useEffect(() => {
    let cancelled = false;

    const fetchArticles = async () => {
      if (offset === 0) {
        setIsInitialLoading(true);
      }
      setLoadingMore(true);

      try {
        const BATCH_SIZE = 12;

        // Try fetching with language filter first (optimal — only requested translation)
        let data, error, count;
        try {
          const result = await supabase
            .from('articles_v2')
            .select(`
              id,
              slug,
              author,
              youtube_url,
              published_at,
              article_translations!inner(title, summary, content, language_code),
              article_categories(
                categories(
                  slug,
                  category_translations(name, language_code)
                )
              )
            `, { count: 'est' })
            .eq('article_translations.language_code', lang)
            .order('published_at', { ascending: false })
            .range(offset, offset + BATCH_SIZE - 1);

          data = result.data;
          error = result.error;
          count = result.count;
        } catch (e) {
          error = e;
        }

        // If inner join returned no results or failed, try without language filter
        if (error || !data || data.length === 0) {
          const fallbackResult = await supabase
            .from('articles_v2')
            .select(`
              id,
              slug,
              author,
              youtube_url,
              published_at,
              article_translations(title, summary, content, language_code),
              article_categories(
                categories(
                  slug,
                  category_translations(name, language_code)
                )
              )
            `, { count: 'est' })
            .order('published_at', { ascending: false })
            .range(offset, offset + BATCH_SIZE - 1);

          data = fallbackResult.data;
          error = fallbackResult.error;
          count = fallbackResult.count;
        }

        if (cancelled) return;

        if (!error && data) {
          const transformed = data.map(a => {
            const translations = a.article_translations || [];
            const translation = translations.find(t => t.language_code === lang) ||
                                translations.find(t => t.language_code === 'ru') ||
                                translations[0] || {};

            const articleCategories = a.article_categories || [];
            const categories = articleCategories.map(ac => {
              const catTranslations = ac.categories?.category_translations || [];
              const catTrans = catTranslations.find(t => t.language_code === lang) ||
                               catTranslations.find(t => t.language_code === 'ru');
              return catTrans ? catTrans.name : ac.categories?.slug;
            }).filter(Boolean);

            return {
              slug: a.slug,
              title: { [lang]: translation.title },
              summary: { [lang]: translation.summary },
              content: { [lang]: translation.content },
              categories: categories,
              author: a.author,
              youtube_url: a.youtube_url,
              published_at: a.published_at
            };
          });

          if (cancelled) return;

          // On offset 0 (fresh load / lang change), replace articles entirely
          if (offset === 0) {
            setRawArticles(transformed);
          } else {
            setRawArticles(prev => [...prev, ...transformed]);
          }

          if (transformed.length < BATCH_SIZE || (count && offset + BATCH_SIZE >= count)) {
            setHasMore(false);
          } else {
            setHasMore(true);
          }

          setIsInitialLoading(false);
          return;
        }

        // Fallback to old schema
        console.warn('New schema fetch failed, falling back to old schema:', error);

        const { data: oldData, error: oldError, count: oldCount } = await supabase
          .from('articles')
          .select('id, slug, title, summary, categories, author, youtube_url, created_at', { count: 'est' })
          .order('created_at', { ascending: false })
          .range(offset, offset + 11);

        if (cancelled) return;
        if (oldError) throw oldError;

        if (oldData) {
          if (offset === 0) {
            setRawArticles(oldData);
          } else {
            setRawArticles(prev => [...prev, ...oldData]);
          }
          if (oldData.length < 12 || (oldCount && offset + 12 >= oldCount)) {
            setHasMore(false);
          } else {
            setHasMore(true);
          }
        }
        setIsInitialLoading(false);
      } catch (fetchError) {
        console.error('Error fetching articles:', fetchError);
        if (cancelled) return;
        // Fallback to local JSON
        try {
          const response = await fetch('/articles/index.json');
          if (cancelled) return;
          if (response.ok) {
            const data = await response.json();
            const batch = data.slice(offset, offset + 12).map(a => ({
              slug: a.id,
              title: { [lang]: a.title, ru: a.title },
              summary: { [lang]: a.summary, ru: a.summary },
              categories: a.categories,
              author: a.author,
              youtube_url: a.youtubeUrl
            }));
            if (offset === 0) {
              setRawArticles(batch);
            } else {
              setRawArticles(prev => [...prev, ...batch]);
            }
            setHasMore(offset + 12 < data.length);
          }
        } catch (e) {
          console.error('Fallback failed:', e);
        }
        setIsInitialLoading(false);
      } finally {
        if (!cancelled) {
          setLoadingMore(false);
        }
      }
    };

    fetchArticles();

    return () => {
      cancelled = true;
    };
  }, [offset, lang]);

  // Load more articles when reaching the end
  useEffect(() => {
    if (visibleCount >= rawArticles.length && hasMore && !loadingMore && !isInitialLoading) {
      setLoadingMore(true);
      setOffset(prev => prev + 12);
    }
  }, [visibleCount, rawArticles.length, hasMore, loadingMore, isInitialLoading]);

  // Derive localized articles from raw data with pre-calculated reading time
  const articles = useMemo(() => {
    return rawArticles.map(article => {
      const content = article.content?.[lang] || article.content?.['ru'] || article.content?.['en'] || '';
      return {
        id: article.slug,
        title: article.title?.[lang] || article.title?.['ru'] || article.title?.['en'] || '',
        summary: article.summary?.[lang] || article.summary?.['ru'] || article.summary?.['en'] || '',
        content: content,
        categories: article.categories || [],
        author: article.author,
        youtubeUrl: article.youtube_url,
        publishedAt: article.published_at,
        readingTime: calculateReadingTime(content, lang)
      };
    });
  }, [rawArticles, lang]);

  const categories = useMemo(() => {
    const allCats = new Set();
    articles.forEach(article => {
      if (Array.isArray(article.categories)) {
        article.categories.forEach(cat => allCats.add(cat));
      } else if (article.category) {
        allCats.add(article.category);
      }
    });
    return ['All', ...Array.from(allCats).sort()];
  }, [articles]);

  const filteredArticles = useMemo(() => {
    let filtered = articles;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(a => {
        const articleCats = Array.isArray(a.categories) ? a.categories : (a.category ? [a.category] : []);
        return articleCats.includes(selectedCategory);
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(query) ||
        (a.summary && a.summary.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [articles, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-slate-900 font-serif">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            {getLocaleString('blog_title', lang)}
          </h1>
          <p className="text-slate-600 max-w-2xl text-lg italic">
            {getLocaleString('blog_subtitle', lang)}
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mb-8 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder={getLocaleString('search_articles_placeholder', lang)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all font-sans"
            />
          </div>
        </div>

        {/* Category Navigation */}
        {!isInitialLoading && categories.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mb-12 font-sans">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setVisibleCount(6);
                }}
                className={`px-4 py-2 rounded-full text-sm transition-all duration-300 border ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-105'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900'
                }`}
              >
                {cat === 'All' ? getLocaleString('all_categories', lang) : cat}
              </button>
            ))}
          </div>
        )}

        {isInitialLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <ArticleCardSkeleton key={`skeleton-${i}`} />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredArticles.slice(0, visibleCount).map((article, index) => {
                const isLast = index === visibleCount - 1;
                return (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    lang={lang}
                    isLast={isLast}
                    lastArticleElementRef={lastArticleElementRef}
                  />
                );
              })}

              {/* Show loading skeletons while loading more */}
              {loadingMore && visibleCount >= filteredArticles.length && (
                <>
                  {[...Array(3)].map((_, i) => (
                    <ArticleCardSkeleton key={`loading-skeleton-${i}`} />
                  ))}
                </>
              )}
            </div>

            {/* Loading indicator for infinite scroll */}
            {visibleCount < filteredArticles.length && loadingMore && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ArticlesPage;
