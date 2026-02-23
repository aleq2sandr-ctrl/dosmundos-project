import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useEditorAuth } from '@/contexts/EditorAuthContext';
import { getLocaleString } from '@/lib/locales';
import { supabase } from '@/lib/supabaseClient';
import { 
  getArticle, saveArticle, submitForReview, publishArticle, 
  rejectArticle, unpublishArticle, getEpisodeAudioUrl 
} from '@/services/articleService';
import ArticleEditor from '@/components/editor/ArticleEditor';
import RevisionHistory from '@/components/editor/RevisionHistory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft, Save, Send, CheckCircle, XCircle, Eye,
  Radio, Play, Pause, Loader2, FileText
} from 'lucide-react';

const STATUS_STYLES = {
  draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  pending: 'bg-orange-100 text-orange-800 border-orange-200',
  published: 'bg-green-100 text-green-800 border-green-200',
};

const ArticleEditorPage = () => {
  const { lang, articleId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { editor: editorAuth, isAuthenticated, isAdmin, openAuthModal } = useEditorAuth();
  const { toast } = useToast();

  // State
  const [article, setArticle] = useState(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('draft');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Audio player for question segment
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // Autosave timer
  const autosaveTimer = useRef(null);
  const lastSavedContent = useRef('');

  // Check auth
  useEffect(() => {
    if (!isAuthenticated) {
      openAuthModal();
    }
  }, [isAuthenticated, openAuthModal]);

  // Load article data
  useEffect(() => {
    const loadArticle = async () => {
      if (articleId === 'new') {
        // New article — check if created from question via URL params
        const questionId = searchParams.get('questionId');
        const episodeSlug = searchParams.get('episode');
        const questionTitle = searchParams.get('title');
        const questionTime = searchParams.get('time');
        const questionEndTime = searchParams.get('endTime');
        
        if (questionTitle) {
          setTitle(decodeURIComponent(questionTitle));
        }
        
        // Load audio if episode provided
        if (episodeSlug) {
          const url = await getEpisodeAudioUrl(episodeSlug, lang);
          if (url && questionTime) {
            const startT = parseInt(questionTime);
            const endT = questionEndTime ? parseInt(questionEndTime) : null;
            setAudioUrl(endT ? `${url}#t=${startT},${endT}` : `${url}#t=${startT}`);
          }
        }
        
        setLoading(false);
        return;
      }

      setLoading(true);
      const data = await getArticle(articleId);
      
      if (!data) {
        toast({ title: getLocaleString('article_not_found', lang), variant: 'destructive' });
        navigate(`/${lang}/articles`);
        return;
      }

      setArticle(data);
      setStatus(data.status || 'draft');

      // Load translation for current language
      const translations = data.article_translations || [];
      const trans = translations.find(t => t.language_code === lang) ||
                    translations.find(t => t.language_code === 'ru') || {};
      
      setTitle(trans.title || '');
      setSummary(trans.summary || '');
      setContent(trans.content || '');
      lastSavedContent.current = trans.content || '';

      // Load audio if linked to question
      if (data.episode_slug && data.question_time !== null) {
        const url = await getEpisodeAudioUrl(data.episode_slug, lang);
        if (url) {
          const startT = data.question_time;
          const endT = data.question_end_time;
          setAudioUrl(endT ? `${url}#t=${startT},${endT}` : `${url}#t=${startT}`);
        }
      }

      setLoading(false);
    };

    loadArticle();
  }, [articleId, lang]);

  // Track unsaved changes
  const handleContentChange = useCallback((newContent) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  }, []);

  // Autosave every 30 seconds
  useEffect(() => {
    if (!hasUnsavedChanges || !article?.id) return;

    autosaveTimer.current = setTimeout(() => {
      handleSave(true);
    }, 30000);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [hasUnsavedChanges, content, title, summary]);

  // Warn on leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Save handler
  const handleSave = useCallback(async (isAutosave = false) => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    // For new articles, create first
    if (articleId === 'new' || !article?.id) {
      if (!title.trim()) {
        if (!isAutosave) toast({ title: getLocaleString('title_required', lang), variant: 'destructive' });
        return;
      }

      setSaving(true);
      
      const questionId = searchParams.get('questionId');
      const episodeSlug = searchParams.get('episode');
      const questionTime = searchParams.get('time');
      const questionEndTime = searchParams.get('endTime');

      // Create via direct insert
      const slug = title.toLowerCase()
        .replace(/[а-яёА-ЯЁ]/g, c => {
          const m = {'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'};
          return m[c.toLowerCase()] || c;
        })
        .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 60);

      const insertData = {
        slug: `${slug}-${Date.now().toString(36)}`,
        status: 'draft',
        author: editorAuth?.name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (questionId) insertData.question_id = parseInt(questionId);
      if (episodeSlug) insertData.episode_slug = episodeSlug;
      if (questionTime) insertData.question_time = parseInt(questionTime);
      if (questionEndTime) insertData.question_end_time = parseInt(questionEndTime);

      const { data: newArticle, error } = await supabase
        .from('articles_v2')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        setSaving(false);
        toast({ title: 'Error creating article', description: error.message, variant: 'destructive' });
        return;
      }

      // Create translation
      await supabase.from('article_translations').insert({
        article_id: newArticle.id,
        language_code: lang,
        title, summary, content
      });

      setArticle(newArticle);
      setStatus('draft');
      lastSavedContent.current = content;
      setHasUnsavedChanges(false);
      setSaving(false);

      // Navigate to the edit URL with the real ID
      navigate(`/${lang}/articles/${newArticle.slug}/edit`, { replace: true });
      
      if (!isAutosave) {
        toast({ title: getLocaleString('article_saved', lang) });
      }
      return;
    }

    // Save existing article
    setSaving(true);
    const result = await saveArticle(article.id, lang, { title, summary, content }, editorAuth);
    setSaving(false);

    if (result.success) {
      lastSavedContent.current = content;
      setHasUnsavedChanges(false);
      if (!isAutosave) {
        toast({ title: getLocaleString('article_saved', lang) });
      }
    } else {
      toast({ title: 'Error saving', description: result.error, variant: 'destructive' });
    }
  }, [isAuthenticated, articleId, article, title, summary, content, lang, editorAuth, searchParams]);

  // Submit for review
  const handleSubmitForReview = async () => {
    if (!article?.id) return;
    
    // Save first
    await handleSave();
    
    const result = await submitForReview(article.id, editorAuth);
    if (result.success) {
      setStatus('pending');
      toast({ title: getLocaleString('submitted_for_review', lang) });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  // Publish (admin only)
  const handlePublish = async () => {
    if (!article?.id || !isAdmin) return;
    
    await handleSave();
    
    const result = await publishArticle(article.id, editorAuth);
    if (result.success) {
      setStatus('published');
      toast({ title: getLocaleString('article_published_toast', lang) });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  // Reject (admin only)
  const handleReject = async () => {
    if (!article?.id || !isAdmin) return;
    
    const reason = window.prompt(getLocaleString('reject_reason', lang));
    if (reason === null) return;
    
    const result = await rejectArticle(article.id, reason, editorAuth);
    if (result.success) {
      setStatus('draft');
      toast({ title: getLocaleString('article_returned', lang) });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  // Unpublish (admin only)
  const handleUnpublish = async () => {
    if (!article?.id || !isAdmin) return;
    
    const result = await unpublishArticle(article.id, editorAuth);
    if (result.success) {
      setStatus('draft');
      toast({ title: getLocaleString('article_unpublished', lang) });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  // Audio playback
  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Handle revision restore
  const handleRevisionRestore = async () => {
    // Reload article data
    if (article?.id) {
      const data = await getArticle(article.id);
      if (data) {
        const translations = data.article_translations || [];
        const trans = translations.find(t => t.language_code === lang) || {};
        setTitle(trans.title || '');
        setSummary(trans.summary || '');
        setContent(trans.content || '');
        lastSavedContent.current = trans.content || '';
        setHasUnsavedChanges(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <FileText className="h-12 w-12 text-slate-300" />
        <p className="text-slate-500">{getLocaleString('auth_required_for_editing', lang)}</p>
        <Button onClick={openAuthModal} className="bg-purple-600 hover:bg-purple-700">
          {getLocaleString('login', lang)}
        </Button>
      </div>
    );
  }

  const episodeDate = article?.episode_slug || searchParams.get('episode');

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/${lang}/articles`)}
            className="text-slate-500"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {getLocaleString('back_to_articles', lang)}
          </Button>
          
          {/* Status badge */}
          <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_STYLES[status]}`}>
            {getLocaleString(`status_${status}`, lang)}
          </span>

          {hasUnsavedChanges && (
            <span className="text-xs text-amber-600">
              • {getLocaleString('unsaved_changes', lang)}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Preview button */}
          {article?.slug && status === 'published' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/${lang}/articles/${article.slug}`)}
            >
              <Eye className="h-4 w-4 mr-1" />
              {getLocaleString('preview', lang)}
            </Button>
          )}

          {/* Save */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            {getLocaleString('save_draft', lang)}
          </Button>

          {/* Submit for review (editors) */}
          {status === 'draft' && (
            <Button
              size="sm"
              onClick={handleSubmitForReview}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Send className="h-4 w-4 mr-1" />
              {getLocaleString('submit_for_review', lang)}
            </Button>
          )}

          {/* Admin actions */}
          {isAdmin && status === 'pending' && (
            <>
              <Button
                size="sm"
                onClick={handlePublish}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                {getLocaleString('publish', lang)}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReject}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-1" />
                {getLocaleString('return_for_revision', lang)}
              </Button>
            </>
          )}

          {isAdmin && status === 'published' && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleUnpublish}
              className="text-amber-600 border-amber-200 hover:bg-amber-50"
            >
              {getLocaleString('unpublish', lang)}
            </Button>
          )}
        </div>
      </div>

      {/* Question audio player & link */}
      {(article?.question_id || searchParams.get('questionId')) && audioUrl && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAudio}
              className="h-9 w-9 p-0 rounded-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </Button>
            
            <div className="flex-1">
              <Link
                to={`/${lang}/${episodeDate}`}
                className="flex items-center gap-2 text-sm text-purple-700 hover:text-purple-900 transition-colors"
              >
                <Radio className="h-4 w-4" />
                <span>{getLocaleString('listen_answer_on_air', lang)}</span>
                {episodeDate && (
                  <span className="text-xs text-purple-500">
                    ({episodeDate})
                  </span>
                )}
              </Link>
            </div>
          </div>
          
          <audio 
            ref={audioRef} 
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            className="w-full h-8"
            controls
          />
        </div>
      )}

      {/* Title */}
      <div className="mb-4">
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setHasUnsavedChanges(true); }}
          placeholder={getLocaleString('article_title_placeholder', lang)}
          className="text-2xl font-serif font-bold border-0 border-b border-slate-200 rounded-none px-0 
            focus-visible:ring-0 focus-visible:border-purple-500 h-auto py-2"
        />
      </div>

      {/* Summary */}
      <div className="mb-4">
        <Textarea
          value={summary}
          onChange={(e) => { setSummary(e.target.value); setHasUnsavedChanges(true); }}
          placeholder={getLocaleString('article_summary_placeholder', lang)}
          className="resize-none border-0 border-b border-slate-200 rounded-none px-0 
            focus-visible:ring-0 focus-visible:border-purple-500 min-h-[60px] text-slate-600"
          rows={2}
        />
      </div>

      {/* WYSIWYG Editor */}
      <div className="mb-6">
        <ArticleEditor
          content={content}
          onChange={handleContentChange}
          placeholder={getLocaleString('start_writing', lang)}
        />
      </div>

      {/* Revision History */}
      {article?.id && (
        <RevisionHistory
          articleId={article.id}
          lang={lang}
          editor={editorAuth}
          onRestore={handleRevisionRestore}
          currentLanguage={lang}
        />
      )}
    </div>
  );
};

export default ArticleEditorPage;
