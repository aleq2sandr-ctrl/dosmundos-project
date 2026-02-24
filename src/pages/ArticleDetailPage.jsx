import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getLocaleString, getPluralizedLocaleString } from '@/lib/locales';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Youtube, Clock, Calendar, Radio, Play, Pause, Edit, RotateCcw, RotateCw } from 'lucide-react';
import { calculateReadingTime, formatArticleDate, formatTime } from '@/lib/utils';
import { updateMetaTags, resetMetaTags } from '@/lib/updateMetaTags';
import { useEditorAuth } from '@/contexts/EditorAuthContext';
import { getEpisodeAudioUrl } from '@/services/articleService';

// Lazy load the article content component
const LazyArticleContent = lazy(() => import('@/components/LazyArticleContent'));

// Color palette for categories (same as ArticlesPage)
// Slug-based color mapping — works for all languages
const categoryColorsBySlug = {
  'teacher-plants-diet': 'bg-green-100 text-green-800 border-green-200',
  'healing-energy-practices': 'bg-purple-100 text-purple-800 border-purple-200',
  'relationships-family': 'bg-pink-100 text-pink-800 border-pink-200',
  'inner-development': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'health-nutrition': 'bg-red-100 text-red-800 border-red-200',
  'energy-protection-cleansing': 'bg-orange-100 text-orange-800 border-orange-200',
  'meditations': 'bg-blue-100 text-blue-800 border-blue-200',
  'default': 'bg-slate-100 text-slate-600 border-slate-200'
};

const getCategoryColor = (cat) => {
  const slug = typeof cat === 'object' ? cat?.slug : cat;
  if (slug && categoryColorsBySlug[slug]) return categoryColorsBySlug[slug];
  return categoryColorsBySlug.default;
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEGMENT AUDIO PLAYER – shows only the question's time range
// ═══════════════════════════════════════════════════════════════════════════════
const ArticleSegmentPlayer = ({ audioUrl, questionTime, questionEndTime, episodeSlug, lang, articleId, isAuthenticated, navigate }) => {
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const startSec = questionTime || 0;
  const endSec = questionEndTime || duration || 0;
  const segmentDuration = Math.max(0, endSec - startSec);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      const rel = audio.currentTime - startSec;
      setCurrentTime(rel);
      if (questionEndTime && audio.currentTime >= questionEndTime) {
        audio.pause();
        setIsPlaying(false);
      }
    };
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => setIsPlaying(false);
    const onPause = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
    };
  }, [startSec, questionEndTime]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      // If before segment or after segment, seek to start
      if (audio.currentTime < startSec || (questionEndTime && audio.currentTime >= questionEndTime)) {
        audio.currentTime = startSec;
      }
      audio.play().catch(() => {});
    }
  }, [isPlaying, startSec, questionEndTime]);

  const skip = useCallback((sec) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(startSec, Math.min(audio.currentTime + sec, endSec || audio.duration));
  }, [startSec, endSec]);

  const handleProgressClick = useCallback((e) => {
    if (!progressRef.current || !audioRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = startSec + ratio * segmentDuration;
  }, [startSec, segmentDuration]);

  const progress = segmentDuration > 0 ? Math.max(0, Math.min(100, (currentTime / segmentDuration) * 100)) : 0;

  return (
    <div className="mb-8 rounded-xl border border-purple-200/60 bg-purple-50/60 overflow-hidden font-sans">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Controls row */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        {/* Skip back */}
        <button onClick={() => skip(-10)} className="p-1 rounded-lg text-purple-400 hover:text-purple-700 transition-colors" title="-10s">
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className="shrink-0 h-9 w-9 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-colors active:scale-95"
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
        </button>

        {/* Skip forward */}
        <button onClick={() => skip(10)} className="p-1 rounded-lg text-purple-400 hover:text-purple-700 transition-colors" title="+10s">
          <RotateCw className="w-4 h-4" />
        </button>

        {/* Time current */}
        <span className="text-xs font-mono text-purple-600 tabular-nums min-w-[36px] text-right">
          {formatTime(Math.max(0, currentTime))}
        </span>

        {/* Progress bar */}
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className="flex-1 h-1.5 bg-purple-200/80 rounded-full cursor-pointer group relative"
        >
          <div
            className="h-full bg-purple-500 rounded-full transition-[width] duration-100 relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-sm border-2 border-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Time total */}
        <span className="text-xs font-mono text-purple-400 tabular-nums min-w-[36px]">
          {formatTime(Math.max(0, segmentDuration))}
        </span>
      </div>

      {/* Bottom links row */}
      <div className="flex items-center gap-3 px-4 pb-3 -mt-0.5">
        <Link
          to={`/${lang}/${episodeSlug}`}
          className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 transition-colors"
        >
          <Radio className="h-3.5 w-3.5" />
          <span className="border-b border-transparent hover:border-purple-400">
            {getLocaleString('listen_answer_on_air', lang)}
          </span>
        </Link>

        <span className="flex-1" />

        {isAuthenticated && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/${lang}/articles/${articleId}/edit`)}
            className="text-purple-500 hover:text-purple-700 h-7 px-2 text-xs"
          >
            <Edit className="h-3.5 w-3.5 mr-1" />
            {getLocaleString('edit', lang)}
          </Button>
        )}
      </div>
    </div>
  );
};

const ArticleDetailPage = () => {
  const { lang, articleId } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, openAuthModal } = useEditorAuth();
  
  // Question audio player state
  const [questionAudioUrl, setQuestionAudioUrl] = useState(null);
  const [questionData, setQuestionData] = useState(null); // { episodeSlug, questionTime, questionEndTime }

  // Scroll to top when article or language changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [articleId, lang]);

  useEffect(() => {
    let cancelled = false;

    const fetchArticleData = async () => {
      // Show loading spinner when language or article changes
      setLoading(true);
      setArticle(null);
      setContent('');
      resetMetaTags();

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
          if (cancelled) return;

          const translations = newArticleData.article_translations || [];
          const translation = translations.find(t => t.language_code === lang) || 
                              translations.find(t => t.language_code === 'ru') || {};
          
          const articleCategories = newArticleData.article_categories || [];
          const categories = articleCategories.map(ac => {
            const catTranslations = ac.categories?.category_translations || [];
            const catTrans = catTranslations.find(t => t.language_code === lang) ||
                             catTranslations.find(t => t.language_code === 'ru');
            const name = catTrans ? catTrans.name : ac.categories?.slug;
            return name ? { slug: ac.categories?.slug, name } : null;
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

          // Load question audio if article is linked to a question
          if (newArticleData.episode_slug && newArticleData.question_time !== null && newArticleData.question_time !== undefined) {
            setQuestionData({
              episodeSlug: newArticleData.episode_slug,
              questionTime: newArticleData.question_time,
              questionEndTime: newArticleData.question_end_time
            });
            const audioUrl = await getEpisodeAudioUrl(newArticleData.episode_slug, lang);
            if (audioUrl) {
              setQuestionAudioUrl(audioUrl);
            }
          }

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

        if (cancelled) return;

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
        if (cancelled) return;
        console.error('Error fetching article:', error);
        navigate(`/${lang}/articles`);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchArticleData();

    return () => {
      cancelled = true;
    };
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
              {(Array.isArray(article.categories) ? article.categories : (article.category ? [article.category] : [])).map((cat, index) => {
                const catName = typeof cat === 'object' ? cat.name : cat;
                return (
                  <span
                    key={index}
                    className={`px-3 py-1.5 rounded-full text-sm font-sans font-medium tracking-wide uppercase border ${getCategoryColor(cat)}`}
                  >
                    {catName}
                  </span>
                );
              })}
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

          {/* Question audio player & link to episode */}
          {questionData && questionAudioUrl && (
            <ArticleSegmentPlayer
              audioUrl={questionAudioUrl}
              questionTime={questionData.questionTime}
              questionEndTime={questionData.questionEndTime}
              episodeSlug={questionData.episodeSlug}
              lang={lang}
              articleId={articleId}
              isAuthenticated={isAuthenticated}
              navigate={navigate}
            />
          )}

          {/* Edit button for authenticated editors (articles without question link) */}
          {isAuthenticated && !questionData && (
            <div className="mb-6 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/${lang}/articles/${articleId}/edit`)}
                className="text-purple-600 border-purple-200 hover:bg-purple-50 font-sans"
              >
                <Edit className="h-4 w-4 mr-1" />
                {getLocaleString('edit', lang)}
              </Button>
            </div>
          )}

          <Suspense fallback={
            <div className="prose prose-xl max-w-none text-justify animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-slate-200 rounded w-full mb-4"></div>
              <div className="h-4 bg-slate-200 rounded w-5/6 mb-4"></div>
              <div className="h-4 bg-slate-200 rounded w-2/3 mb-4"></div>
            </div>
          }>
            <style>{`
              .article-body p {
                margin: 0;
                text-indent: 1.8em;
              }
              .article-body p + p {
                margin-top: 1.05em;
              }
              .question-block {
                position: relative;
                margin: 1.8em 0;
                padding: 1.4em 1.6em 1.4em 1.8em;
                background: #fffbeb;
                border: 1px solid #fde68a;
                border-radius: 12px;
                color: #78350f;
              }
              .question-block::before {
                content: '?';
                position: absolute;
                top: -0.15em;
                left: 0.15em;
                font-size: 3em;
                line-height: 1;
                color: rgba(217, 119, 6, 0.15);
                font-family: Georgia, serif;
                font-weight: 700;
                pointer-events: none;
              }
              .question-block p {
                margin: 0.2em 0;
                color: #78350f;
                font-weight: 500;
                font-size: 1.1em;
                line-height: 1.6;
                font-style: italic;
                text-indent: 0;
              }
            `}</style>
            <div className="article-body prose prose-xl max-w-none text-justify
              prose-headings:font-serif prose-headings:text-slate-900 prose-headings:font-bold
              prose-p:text-slate-800 prose-p:leading-loose prose-p:font-serif prose-p:indent-8 prose-p:mb-4
              prose-a:text-purple-700 prose-a:no-underline hover:prose-a:text-purple-900 hover:prose-a:underline
              prose-strong:text-slate-900 prose-strong:font-semibold
              prose-ul:text-slate-800 prose-ol:text-slate-800
              prose-blockquote:border-l-4 prose-blockquote:border-l-purple-500 prose-blockquote:bg-gradient-to-br prose-blockquote:from-purple-50 prose-blockquote:to-purple-100/50 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:not-italic prose-blockquote:text-purple-900 prose-blockquote:font-medium prose-blockquote:shadow-sm">
              <LazyArticleContent htmlContent={content} />
            </div>
          </Suspense>

          {/* Editor Actions (Bottom) */}
          <div className="mt-12 pt-8 border-t border-slate-200 flex justify-center font-sans">
            {!isAuthenticated ? (
              <Button
                variant="ghost"
                onClick={openAuthModal}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                <User className="w-4 h-4 mr-2" />
                {getLocaleString('login_as_editor', lang) || 'Login as editor'}
              </Button>
            ) : (
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/${lang}/articles/${articleId}/edit`)}
                  className="text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {getLocaleString('edit_article', lang) || 'Edit Article'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/${lang}/drafts`)}
                  className="text-slate-600 border-slate-200 hover:bg-slate-50"
                >
                  {getLocaleString('manage_drafts', lang) || 'Manage Drafts'}
                </Button>
              </div>
            )}
          </div>

        </article>
      </div>
    </div>
  );
};

export default ArticleDetailPage;
