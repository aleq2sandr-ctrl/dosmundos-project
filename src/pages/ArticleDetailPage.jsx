import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getLocaleString } from '@/lib/locales';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Youtube, Share2 } from 'lucide-react';

const ArticleDetailPage = () => {
  const { lang, articleId } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticleData = async () => {
      try {
        // Fetch index to get metadata
        const indexResponse = await fetch('/articles/index.json');
        if (!indexResponse.ok) throw new Error('Failed to fetch index');
        const indexData = await indexResponse.json();
        
        const foundArticle = indexData.find(a => a.id === articleId);
        
        if (!foundArticle) {
          navigate(`/${lang}/articles`);
          return;
        }
        
        setArticle(foundArticle);

        // Fetch content
        const contentResponse = await fetch(foundArticle.contentUrl);
        if (contentResponse.ok) {
          const htmlText = await contentResponse.text();
          
          // Extract body content
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlText, 'text/html');
          const bodyContent = doc.body.innerHTML;
          
          setContent(bodyContent);
        } else {
          setContent('<p>Error loading content.</p>');
        }
      } catch (error) {
        console.error('Error fetching article:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticleData();
  }, [articleId, lang, navigate]);

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
        videoId = videoId.split(/[#?\/]/)[0];
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
            {lang === 'ru' ? 'Назад к статьям' : 'Back to articles'}
          </Button>
        </Link>

        <article className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <header className="mb-10 text-center">
            <div className="flex justify-center mb-6">
              <span className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-sm font-sans font-medium tracking-wide uppercase border border-slate-200">
                {article.category}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-8 leading-tight">
              {article.title}
            </h1>
            
            <div className="flex items-center justify-center gap-6 text-slate-500 text-sm uppercase tracking-wider font-medium border-y border-slate-200 py-4 font-sans">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {article.author}
              </div>
            </div>
          </header>

          <div 
            className="prose prose-xl max-w-none text-justify
              prose-headings:font-serif prose-headings:text-slate-900 prose-headings:font-bold
              prose-p:text-slate-800 prose-p:leading-loose prose-p:font-serif prose-p:indent-12 prose-p:mb-6
              prose-a:text-purple-700 prose-a:no-underline hover:prose-a:text-purple-900 hover:prose-a:underline
              prose-strong:text-slate-900 prose-strong:font-semibold
              prose-ul:text-slate-800 prose-ol:text-slate-800
              prose-blockquote:border-l-slate-900 prose-blockquote:bg-slate-50 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-slate-700"
            dangerouslySetInnerHTML={{ __html: content }}
          />

          {article.youtubeUrl && (
            <div className="mt-16 pt-8 border-t border-slate-200 flex justify-center">
              <a 
                href={article.youtubeUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-xl hover:bg-slate-50 transition-all shadow-md hover:shadow-lg hover:-translate-y-1 font-sans group"
              >
                <div className="bg-red-600 text-white p-2 rounded-full group-hover:scale-110 transition-transform">
                  <Youtube className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-lg leading-none mb-1">
                    {lang === 'ru' ? 'Смотреть на YouTube' : 'Watch on YouTube'}
                  </div>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                    {lang === 'ru' ? 'Видео версия статьи' : 'Video version'}
                  </div>
                </div>
              </a>
            </div>
          )}
        </article>
      </div>
    </div>
  );
};

export default ArticleDetailPage;
