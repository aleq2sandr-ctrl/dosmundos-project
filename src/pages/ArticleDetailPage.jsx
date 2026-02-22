import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getLocaleString, getPluralizedLocaleString } from '@/lib/locales';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Youtube, Clock, Calendar } from 'lucide-react';
import { calculateReadingTime, formatArticleDate } from '@/lib/utils';
import { updateMetaTags, resetMetaTags } from '@/lib/updateMetaTags';

// Lazy load the article content component
const LazyArticleContent = lazy(() => import('@/components/LazyArticleContent'));

// Color palette for categories (same as ArticlesPage)
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

const ArticleDetailPage = () => {
  const { lang, articleId } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  // Scroll to top when article opens
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [articleId]);

  useEffect(() => {
    const fetchArticleData = async () => {
      try {
        // Try fetching from new schema first
        const { data: newArticleData, error: newError } = await supabase
          .from('articles_v2')
          .select(`
            *,
            article_translations(title, summary, content, language_code),
            article_categories(
              categories(
                slug,
                category_translations(name, language_code)
              )
            )
          `)
          .eq('slug', articleId)
          .single();

        if (!newError && newArticleData) {
          const translations = newArticleData.article_translations || [];
          const translation = translations.find(t => t.language_code === lang) || 
                              translations.find(t => t.language_code === 'ru') || {};
          
          const articleCategories = newArticleData.article_categories || [];
          const categories = articleCategories.map(ac => {
            const catTranslations = ac.categories?.category_translations || [];
            const catTrans = catTranslations.find(t => t.language_code === lang) ||
                             catTranslations.find(t => t.language_code === 'ru');
            return catTrans ? catTrans.name : ac.categories?.slug;
          }).filter(Boolean);

          setArticle({
            id: newArticleData.slug,
            title: translation.title,
            summary: translation.summary,
            categories: categories,
            author: newArticleData.author,
            youtubeUrl: newArticleData.youtube_url,
            publishedAt: newArticleData.published_at
          });

          // Update meta tags for SEO and social media preview
          updateMetaTags({
            id: newArticleData.slug,
            title: translation.title,
            summary: translation.summary,
            lang: lang,
            author: newArticleData.author,
            publishedAt: newArticleData.published_at,
            categories: categories,
            image: newArticleData.image_url || `${window.location.origin}/og-default.jpg`
          });

          const rawContent = translation.content || '';
          if (rawContent.includes('<html') || rawContent.includes('<body')) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(rawContent, 'text/html');
            setContent(doc.body.innerHTML);
          } else {
            setContent(rawContent);
          }
          setLoading(false);
          return;
        }

        // Fallback to old schema
        const { data: articleData, error } = await supabase
          .from('articles')
          .select('*')
          .eq('slug', articleId)
          .single();

        if (error || !articleData) {
          console.error('Error fetching article from Supabase:', error);
          // Fallback to local file system
          try {
            const indexResponse = await fetch('/articles/index.json');
            if (!indexResponse.ok) throw new Error('Failed to fetch index');
            const indexData = await indexResponse.json();
            const foundArticle = indexData.find(a => a.id === articleId);
            
            if (foundArticle) {
              setArticle(foundArticle);
              const contentResponse = await fetch(foundArticle.contentUrl);
              if (contentResponse.ok) {
                const htmlText = await contentResponse.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');
                setContent(doc.body.innerHTML);
              }
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error('Fallback failed:', e);
          }
          
          navigate(`/${lang}/articles`);
          return;
        }

        // Transform Supabase data
        const transformedArticle = {
          id: articleData.slug,
          title: articleData.title[lang] || articleData.title['ru'] || articleData.title['en'],
          summary: articleData.summary[lang] || articleData.summary['ru'] || articleData.summary['en'],
          categories: articleData.categories || [],
          author: articleData.author,
          youtubeUrl: articleData.youtube_url
        };

        setArticle(transformedArticle);

        // Update meta tags for social media preview
        updateMetaTags({
          id: articleData.slug,
          title: transformedArticle.title,
          summary: transformedArticle.summary,
          lang: lang
        });
        
        // Get content
        const rawContent = articleData.content[lang] || articleData.content['ru'] || articleData.content['en'] || '';
        
        // Parse HTML to extract body content if it's a full document
        if (rawContent.includes('<html') || rawContent.includes('<body')) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(rawContent, 'text/html');
          setContent(doc.body.innerHTML);
        } else {
          setContent(rawContent);
        }

      } catch (error) {
        console.error('Error fetching article:', error);
        navigate(`/${lang}/articles`);
      } finally {
        setLoading(false);
      }
    };

    fetchArticleData();
  }, [lang, articleId, navigate]);

  // Reset meta tags when component unmounts
  useEffect(() => {
    return () => {
      resetMetaTags();
    };
  }, []);


  const getYoutubeEmbedUrl = (url) => {
    if (!url) return null;
    try {
      let videoId = null;
      
      // Handle standard youtube.com/watch?v=ID
      if (url.includes('v=')) {
        videoId = url.split('v=')[1].split('&')[0];
      } 
      // Handle youtu.be/ID
      else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
      }
      // Handle embed/ID
      else if (url.includes('embed/')) {
        videoId = url.split('embed/')[1].split('?')[0];
      }

      if (videoId) {
        // Clean up any trailing parameters or slashes
        videoId = videoId.split(/[#?/]/)[0];
        if (videoId.length === 11) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }
      
      return null;
    } catch (e) {
      console.error('Error parsing YouTube URL:', e);
      return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-900 bg-[#fdfbf7]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!article) return null;

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-slate-900 font-serif">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Link to={`/${lang}/articles`}>
          <Button variant="ghost" className="text-slate-500 mb-8 gap-2 pl-0 hover:text-slate-900 hover:bg-transparent transition-colors group font-sans">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {getLocaleString('back_to_articles', lang)}
          </Button>
        </Link>

        <article className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <header className="mb-10 text-center">
            <div className="flex justify-center flex-wrap gap-2 mb-6">
              {(Array.isArray(article.categories) ? article.categories : (article.category ? [article.category] : [])).map((cat, index) => (
                <span
                  key={index}
                  className={`px-3 py-1.5 rounded-full text-sm font-sans font-medium tracking-wide uppercase border ${getCategoryColor(cat)}`}
                >
                  {cat}
                </span>
              ))}
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-8 leading-tight">
              {article.title}
            </h1>
            
            <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-4 md:gap-4 text-slate-500 text-sm uppercase tracking-wider font-medium border-y border-slate-200 py-4 font-sans">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {article.author}
              </div>
              {article.publishedAt && (
                <>
                  <span className="hidden md:inline text-slate-300">•</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="normal-case">{formatArticleDate(article.publishedAt, lang)}</span>
                  </div>
                </>
              )}
              {content && (() => {
                const readingTime = calculateReadingTime(content, lang);
                return (
                <>
                  <span className="hidden md:inline text-slate-300">•</span>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="normal-case">{getPluralizedLocaleString('reading_time_minutes', lang, readingTime, { count: readingTime })}</span>
                  </div>
                </>
              )}
              )()}
              {article.youtubeUrl && (
                <>
                  <span className="hidden md:inline text-slate-300">•</span>
                  <a 
                    href={article.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-red-600 transition-colors group/yt"
                  >
                    <Youtube className="w-4 h-4 group-hover/yt:text-red-600" />
                    <span className="normal-case border-b border-transparent group-hover/yt:border-red-600">
                      {getLocaleString('watch_on_youtube', lang)}
                    </span>
                  </a>
                </>
              )}
            </div>
          </header>

          <Suspense fallback={
            <div className="prose prose-xl max-w-none text-justify animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-slate-200 rounded w-full mb-4"></div>
              <div className="h-4 bg-slate-200 rounded w-5/6 mb-4"></div>
              <div className="h-4 bg-slate-200 rounded w-2/3 mb-4"></div>
            </div>
          }>
            <div className="prose prose-xl max-w-none text-justify
              prose-headings:font-serif prose-headings:text-slate-900 prose-headings:font-bold
              prose-p:text-slate-800 prose-p:leading-loose prose-p:font-serif prose-p:indent-8 prose-p:mb-4
              prose-a:text-purple-700 prose-a:no-underline hover:prose-a:text-purple-900 hover:prose-a:underline
              prose-strong:text-slate-900 prose-strong:font-semibold
              prose-ul:text-slate-800 prose-ol:text-slate-800
              prose-blockquote:border-l-slate-900 prose-blockquote:bg-slate-50 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-slate-700">
              <LazyArticleContent htmlContent={content} />
            </div>
          </Suspense>

        </article>
      </div>
    </div>
  );
};

export default ArticleDetailPage;
