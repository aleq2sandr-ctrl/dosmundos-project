import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getLocaleString } from '@/lib/locales';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, Plus, FileEdit, FileSearch, Loader2, User } from 'lucide-react';
import { calculateReadingTime } from '@/lib/utils';
import ArticleCard from '@/components/ArticleCard';
import ArticleCardSkeleton from '@/components/ArticleCardSkeleton';
import { useEditorAuth } from '@/contexts/EditorAuthContext';
import { Button } from '@/components/ui/button';

const DraftsPage = () => {
  const { lang } = useParams();
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'draft' | 'pending'
  const { isAuthenticated, openAuthModal } = useEditorAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchDrafts = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('articles_v2')
          .select(`
            id,
            slug,
            author,
            youtube_url,
            published_at,
            status,
            created_at,
            article_translations(title, summary, content, language_code),
            article_categories(
              categories(
                slug,
                category_translations(name, language_code)
              )
            )
          `)
          .in('status', statusFilter === 'all' ? ['draft', 'pending'] : [statusFilter])
          .order('created_at', { ascending: false });

        const { data, error } = await query;

        if (cancelled) return;

        if (error) {
          console.error('Error fetching drafts:', error);
          setArticles([]);
          return;
        }

        const transformed = (data || []).map(a => {
          const translations = a.article_translations || [];
          const translation = translations.find(t => t.language_code === lang) ||
                              translations.find(t => t.language_code === 'ru') ||
                              translations[0] || {};

          const articleCategories = a.article_categories || [];
          const categories = articleCategories.map(ac => {
            const catTranslations = ac.categories?.category_translations || [];
            const catTrans = catTranslations.find(t => t.language_code === lang) ||
                             catTranslations.find(t => t.language_code === 'ru');
            const name = catTrans ? catTrans.name : ac.categories?.slug;
            return name ? { slug: ac.categories?.slug, name } : null;
          }).filter(Boolean);

          const content = translation.content || '';

          return {
            id: a.slug,
            title: translation.title || a.slug,
            summary: translation.summary || '',
            categories,
            author: a.author,
            youtubeUrl: a.youtube_url,
            publishedAt: a.published_at || a.created_at,
            status: a.status,
            readingTime: calculateReadingTime(content, lang)
          };
        });

        setArticles(transformed);
      } catch (err) {
        console.error('Error fetching drafts:', err);
        if (!cancelled) setArticles([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDrafts();
    return () => { cancelled = true; };
  }, [isAuthenticated, statusFilter, lang]);

  // Not authenticated — show login prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] text-slate-900 font-serif">
        <div className="container mx-auto px-4 py-12 max-w-3xl text-center">
          <div className="mb-8">
            <Link to={`/${lang}/articles`}>
              <Button variant="ghost" className="text-slate-500 gap-2 pl-0 hover:text-slate-900 hover:bg-transparent transition-colors group font-sans">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                {getLocaleString('back_to_articles', lang)}
              </Button>
            </Link>
          </div>
          
          <div className="py-20">
            <FileEdit className="w-16 h-16 text-slate-300 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-slate-900 mb-4">
              {getLocaleString('drafts_title', lang) || 'Drafts & Pending Review'}
            </h1>
            <p className="text-slate-500 mb-8">
              {getLocaleString('login_required_drafts', lang) || 'Log in to manage drafts'}
            </p>
            <Button
              onClick={openAuthModal}
              className="bg-purple-600 hover:bg-purple-700 text-white font-sans"
            >
              <User className="w-4 h-4 mr-2" />
              {getLocaleString('login_as_editor', lang) || 'Login as editor'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-slate-900 font-serif">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to={`/${lang}/articles`}>
            <Button variant="ghost" className="text-slate-500 gap-2 pl-0 hover:text-slate-900 hover:bg-transparent transition-colors group font-sans">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              {getLocaleString('back_to_articles', lang)}
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={() => navigate(`/${lang}/articles/new/edit`)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-sans"
          >
            <Plus className="h-4 w-4 mr-1" />
            {getLocaleString('new_article', lang)}
          </Button>
        </div>

        {/* Title */}
        <div className="flex flex-col items-center mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">
            {getLocaleString('drafts_title', lang) || 'Drafts & Pending Review'}
          </h1>
          <p className="text-slate-500 text-lg italic">
            {getLocaleString('drafts_subtitle', lang) || 'Manage unpublished articles'}
          </p>
        </div>

        {/* Status filter tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 font-sans">
            {[
              { key: 'all', label: getLocaleString('all', lang), icon: null },
              { key: 'draft', label: getLocaleString('status_draft', lang), icon: <FileEdit className="h-3.5 w-3.5" /> },
              { key: 'pending', label: getLocaleString('status_pending', lang), icon: <FileSearch className="h-3.5 w-3.5" /> },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <ArticleCardSkeleton key={`skeleton-${i}`} />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20">
            <FileEdit className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">
              {getLocaleString('drafts_empty', lang) || 'No drafts or pending articles'}
            </p>
            <Button
              variant="outline"
              onClick={() => navigate(`/${lang}/articles/new/edit`)}
              className="mt-6 font-sans"
            >
              <Plus className="h-4 w-4 mr-1" />
              {getLocaleString('new_article', lang)}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                lang={lang}
                hideStatus={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DraftsPage;
