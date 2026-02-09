import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getLocaleString, getPluralizedLocaleString } from '@/lib/locales';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, ArrowRight, Youtube, BookOpen, Search, Loader2, Clock, Calendar } from 'lucide-react';
import { calculateReadingTime, formatArticleDate } from '@/lib/utils';

// Color palette for categories
const categoryColors = {
  'Растения Учителя и Процесс Диеты': 'bg-green-100 text-green-800 border-green-200',
  'Целительство и Энергетические практики': 'bg-purple-100 text-purple-800 border-purple-200',
  'Взаимоотношения и семья': 'bg-pink-100 text-pink-800 border-pink-200',
  'Внутренние развитие': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Здоровье и Питание': 'bg-red-100 text-red-800 border-red-200',
  'Энергетическая защита и очищение': 'bg-orange-100 text-orange-800 border-orange-200',
  'Медитации': 'bg-blue-100 text-blue-800 border-blue-200',
  'default': 'bg-slate-100 text-slate-600 border-slate-200'
};

const getCategoryColor = (category) => {
  return categoryColors[category] || categoryColors.default;
};

const ArticlesPage = () => {
  const { lang } = useParams();
  const [rawArticles, setRawArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(6); // Start with 6 items for faster initial load
  
  // Infinite scroll observer with debounce
  const observer = useRef();
  const debounceTimer = useRef();
  const lastArticleElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        // Debounce to prevent multiple triggers
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
          setVisibleCount(prev => prev + 6); // Load 6 more items at a time
        }, 300);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading]);

  // Fetch raw data once
  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      try {
        // Try fetching from new schema first - EXCLUDE content field for performance
        const { data, error } = await supabase
          .from('articles_v2')
          .select(`
            id,
            slug,
            author,
            youtube_url,
            published_at,
            article_translations(title, summary, language_code),
            article_categories(
              categories(
                slug,
                category_translations(name, language_code)
              )
            )
          `)
          .order('published_at', { ascending: false })
          .limit(50); // Limit initial fetch to 50 items for better performance

        if (!error && data) {
          // Transform new schema to component format
          const transformed = data.map(a => {
            const translations = a.article_translations || [];
            const translation = translations.find(t => t.language_code === lang) || 
                                translations.find(t => t.language_code === 'ru') || {};
            
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
              categories: categories,
              author: a.author,
              youtube_url: a.youtube_url,
              published_at: a.published_at
            };
          });
          setRawArticles(transformed);
          setLoading(false);
          return;
        }

        // Fallback to old schema if new one fails (e.g. tables not created yet)
        console.warn('New schema fetch failed, falling back to old schema:', error);
        
        const { data: oldData, error: oldError } = await supabase
          .from('articles')
          .select('id, slug, title, summary, categories, author, youtube_url, created_at')
          .order('created_at', { ascending: false })
          .limit(50);

        if (oldError) throw oldError;

        if (oldData) {
          setRawArticles(oldData);
        }
      } catch (error) {
        console.error('Error fetching articles:', error);
        // Fallback to local JSON
        try {
          const response = await fetch('/articles/index.json');
          if (response.ok) {
            const data = await response.json();
            setRawArticles(data.map(a => ({
              slug: a.id,
              title: { [lang]: a.title, ru: a.title },
              summary: { [lang]: a.summary, ru: a.summary },
              categories: a.categories,
              author: a.author,
              youtube_url: a.youtubeUrl
            })).slice(0, 50)); // Limit to 50 items
          }
        } catch (e) {
          console.error('Fallback failed:', e);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [lang]); // Re-fetch when lang changes to get correct translations from DB (or optimize to fetch all langs)

  // Derive localized articles from raw data
  const articles = useMemo(() => {
    return rawArticles.map(article => ({
      id: article.slug,
      title: article.title?.[lang] || article.title?.['ru'] || article.title?.['en'] || '',
      summary: article.summary?.[lang] || article.summary?.['ru'] || article.summary?.['en'] || '',
      content: article.content?.[lang] || article.content?.['ru'] || article.content?.['en'] || '',
      categories: article.categories || [],
      author: article.author,
      youtubeUrl: article.youtube_url,
      publishedAt: article.published_at
    }));
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
        {!loading && categories.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mb-12 font-sans">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
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

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-slate-900" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredArticles.slice(0, visibleCount).map((article, index) => {
                const isLast = index === visibleCount - 1;
                return (
                  <div 
                    key={article.id} 
                    ref={isLast ? lastArticleElementRef : null}
                    className="h-full"
                  >
                    <Link 
                      to={`/${lang}/articles/${article.id}`}
                      className="group h-full block"
                    >
                      <Card className="h-full bg-white border-slate-200 text-slate-900 overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 group-hover:border-slate-300 flex flex-col">
                        <CardHeader className="pb-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex flex-wrap gap-1">
                              {(Array.isArray(article.categories) ? article.categories : (article.category ? [article.category] : [])).map((cat, index) => (
                                <span
                                  key={index}
                                  className={`px-2 py-1 rounded-full text-xs font-medium tracking-wide uppercase border font-sans ${getCategoryColor(cat)}`}
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                            {article.youtubeUrl && (
                              <Youtube className="w-5 h-5 text-red-600 opacity-80" />
                            )}
                          </div>
                          <CardTitle className="text-2xl font-bold leading-tight group-hover:text-purple-700 transition-colors">
                            {article.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col">
                          <CardDescription className="text-slate-600 text-base leading-relaxed line-clamp-3 mb-6 flex-grow">
                            {article.summary}
                          </CardDescription>
                          
                          <div className="space-y-3 mt-auto">
                            {/* Date and Reading Time */}
                            <div className="flex items-center gap-4 text-xs text-slate-500 font-sans">
                              {article.publishedAt && (
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{formatArticleDate(article.publishedAt, lang)}</span>
                                </div>
                              )}
                              {article.content && (
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{getPluralizedLocaleString('reading_time_minutes', lang, calculateReadingTime(article.content, lang), { count: calculateReadingTime(article.content, lang) })}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Author and Read Link */}
                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                              <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider font-medium">
                                <User className="w-3 h-3" />
                                {article.author}
                              </div>
                              <span className="flex items-center gap-2 text-sm text-purple-700 font-medium group-hover:translate-x-1 transition-transform italic font-serif">
                                {getLocaleString('read_article', lang)}
                                <ArrowRight className="w-4 h-4" />
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                );
              })}
            </div>
            
            {/* Loading indicator for infinite scroll */}
            {visibleCount < filteredArticles.length && (
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
