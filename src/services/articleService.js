import { supabase } from '@/lib/supabaseClient';
import { saveEditToHistory } from '@/services/editHistoryService';

/**
 * Article Service — CRUD for blog articles with question linking
 */

/**
 * Create a draft article from a radio question
 */
export const createDraftFromQuestion = async ({
  questionId,
  episodeSlug,
  questionTime,
  questionEndTime,
  lang,
  title,
  transcriptHtml,
  editorId,
  editorEmail,
  editorName
}) => {
  try {
    // Generate slug from title
    const slug = generateSlug(title, episodeSlug, questionId);

    // Check if article already exists for this question
    const existing = await getArticleByQuestionId(questionId);
    if (existing) {
      return { success: true, data: existing, existed: true };
    }

    // Create article
    const { data: article, error: articleError } = await supabase
      .from('articles_v2')
      .insert({
        slug,
        status: 'draft',
        question_id: questionId,
        episode_slug: episodeSlug,
        question_time: questionTime,
        question_end_time: questionEndTime,
        author: editorName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (articleError) throw articleError;

    // Create translation with transcript as initial content
    const { error: transError } = await supabase
      .from('article_translations')
      .insert({
        article_id: article.id,
        language_code: lang,
        title: title,
        summary: '',
        content: transcriptHtml || ''
      });

    if (transError) throw transError;

    // Record in edit history
    await saveEditToHistory({
      editorId,
      editorEmail,
      editorName,
      editType: 'create',
      targetType: 'article',
      targetId: article.id,
      contentBefore: '',
      contentAfter: JSON.stringify({ title, slug, questionId }),
      metadata: { lang, episodeSlug, questionId, action: 'create_from_question' }
    });

    return { success: true, data: article };
  } catch (error) {
    console.error('Error creating draft from question:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get article by ID with translations and question info
 */
export const getArticle = async (articleId) => {
  try {
    const { data, error } = await supabase
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
      .eq('id', articleId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    // Try by slug
    try {
      const { data, error: slugError } = await supabase
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

      if (slugError) throw slugError;
      return data;
    } catch (slugErr) {
      console.error('Error fetching article:', slugErr);
      return null;
    }
  }
};

/**
 * Get article linked to a specific question
 */
export const getArticleByQuestionId = async (questionId) => {
  try {
    const { data, error } = await supabase
      .from('articles_v2')
      .select('id, slug, status, question_id, episode_slug')
      .eq('question_id', questionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('Error fetching article by question:', error);
    return null;
  }
};

/**
 * Get article statuses for all questions of an episode (batch)
 * Returns { [question_id]: { articleId, slug, status } }
 */
export const getArticleStatusesByEpisode = async (episodeSlug) => {
  try {
    const { data, error } = await supabase
      .from('articles_v2')
      .select('id, slug, status, question_id')
      .eq('episode_slug', episodeSlug)
      .not('question_id', 'is', null);

    if (error) throw error;

    const map = {};
    (data || []).forEach(a => {
      map[a.question_id] = {
        articleId: a.id,
        slug: a.slug,
        status: a.status
      };
    });
    return map;
  } catch (error) {
    console.error('Error fetching article statuses:', error);
    return {};
  }
};

/**
 * Save article translation (title, summary, content)
 */
export const saveArticle = async (articleId, lang, { title, summary, content }, editor) => {
  try {
    // Get current content for edit history
    const { data: currentTrans } = await supabase
      .from('article_translations')
      .select('title, summary, content')
      .eq('article_id', articleId)
      .eq('language_code', lang)
      .single();

    const contentBefore = currentTrans ? JSON.stringify(currentTrans) : '';

    // Upsert translation
    const { data: existing } = await supabase
      .from('article_translations')
      .select('article_id')
      .eq('article_id', articleId)
      .eq('language_code', lang)
      .single();

    let transError;
    if (existing) {
      const { error } = await supabase
        .from('article_translations')
        .update({ title, summary, content })
        .eq('article_id', articleId)
        .eq('language_code', lang);
      transError = error;
    } else {
      const { error } = await supabase
        .from('article_translations')
        .insert({ article_id: articleId, language_code: lang, title, summary, content });
      transError = error;
    }

    if (transError) throw transError;

    // Update article updated_at
    await supabase
      .from('articles_v2')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', articleId);

    // Save to edit history
    if (editor) {
      await saveEditToHistory({
        editorId: editor.id,
        editorEmail: editor.email,
        editorName: editor.name,
        editType: 'text_edit',
        targetType: 'article',
        targetId: articleId,
        contentBefore,
        contentAfter: JSON.stringify({ title, summary, content }),
        metadata: { lang, action: 'save_article' }
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving article:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Submit article for review (editor → pending)
 */
export const submitForReview = async (articleId, editor) => {
  try {
    const { error } = await supabase
      .from('articles_v2')
      .update({
        status: 'pending',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId);

    if (error) throw error;

    if (editor) {
      await saveEditToHistory({
        editorId: editor.id,
        editorEmail: editor.email,
        editorName: editor.name,
        editType: 'status_change',
        targetType: 'article',
        targetId: articleId,
        contentBefore: 'draft',
        contentAfter: 'pending',
        metadata: { action: 'submit_for_review' }
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error submitting for review:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Publish article (admin only: pending → published)
 */
export const publishArticle = async (articleId, editor) => {
  try {
    if (editor?.role !== 'admin') {
      return { success: false, error: 'Only admins can publish articles' };
    }

    const { error } = await supabase
      .from('articles_v2')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        published_by: editor.email,
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId);

    if (error) throw error;

    await saveEditToHistory({
      editorId: editor.id,
      editorEmail: editor.email,
      editorName: editor.name,
      editType: 'status_change',
      targetType: 'article',
      targetId: articleId,
      contentBefore: 'pending',
      contentAfter: 'published',
      metadata: { action: 'publish' }
    });

    return { success: true };
  } catch (error) {
    console.error('Error publishing article:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reject article back to draft (admin → draft with reason)
 */
export const rejectArticle = async (articleId, reason, editor) => {
  try {
    if (editor?.role !== 'admin') {
      return { success: false, error: 'Only admins can reject articles' };
    }

    const { error } = await supabase
      .from('articles_v2')
      .update({
        status: 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId);

    if (error) throw error;

    await saveEditToHistory({
      editorId: editor.id,
      editorEmail: editor.email,
      editorName: editor.name,
      editType: 'status_change',
      targetType: 'article',
      targetId: articleId,
      contentBefore: 'pending',
      contentAfter: 'draft',
      metadata: { action: 'reject', reason }
    });

    return { success: true };
  } catch (error) {
    console.error('Error rejecting article:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Unpublish article (admin → draft)
 */
export const unpublishArticle = async (articleId, editor) => {
  try {
    const { error } = await supabase
      .from('articles_v2')
      .update({
        status: 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId);

    if (error) throw error;

    if (editor) {
      await saveEditToHistory({
        editorId: editor.id,
        editorEmail: editor.email,
        editorName: editor.name,
        editType: 'status_change',
        targetType: 'article',
        targetId: articleId,
        contentBefore: 'published',
        contentAfter: 'draft',
        metadata: { action: 'unpublish' }
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error unpublishing article:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get article revision history from edit_history
 */
export const getArticleRevisions = async (articleId) => {
  try {
    const { data, error } = await supabase
      .from('edit_history')
      .select('*')
      .eq('target_type', 'article')
      .eq('target_id', articleId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching article revisions:', error);
    return [];
  }
};

/**
 * Restore article to a previous revision
 */
export const restoreRevision = async (articleId, revision, lang, editor) => {
  try {
    if (!revision.content_before) {
      return { success: false, error: 'No previous content to restore' };
    }

    const previousContent = JSON.parse(revision.content_before);

    // Save current content as a new revision before restoring
    const { data: currentTrans } = await supabase
      .from('article_translations')
      .select('title, summary, content')
      .eq('article_id', articleId)
      .eq('language_code', lang)
      .single();

    // Apply the restoration
    const { error } = await supabase
      .from('article_translations')
      .update({
        title: previousContent.title || currentTrans?.title,
        summary: previousContent.summary || currentTrans?.summary,
        content: previousContent.content || currentTrans?.content
      })
      .eq('article_id', articleId)
      .eq('language_code', lang);

    if (error) throw error;

    // Record the restore action
    if (editor) {
      await saveEditToHistory({
        editorId: editor.id,
        editorEmail: editor.email,
        editorName: editor.name,
        editType: 'restore',
        targetType: 'article',
        targetId: articleId,
        contentBefore: JSON.stringify(currentTrans),
        contentAfter: revision.content_before,
        metadata: { lang, action: 'restore_revision', restoredFromEditId: revision.id }
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error restoring revision:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get articles by status with language filter
 */
export const getArticlesByStatus = async (status, lang, limit = 50, offset = 0) => {
  try {
    let query = supabase
      .from('articles_v2')
      .select(`
        id, slug, status, author, published_at, created_at, updated_at,
        question_id, episode_slug, question_time, submitted_at,
        article_translations!inner(title, summary, language_code),
        article_categories(
          categories(
            slug,
            category_translations(name, language_code)
          )
        )
      `, { count: 'exact' })
      .eq('article_translations.language_code', lang);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: data || [], count };
  } catch (error) {
    console.error('Error fetching articles by status:', error);
    return { data: [], count: 0 };
  }
};

/**
 * Get audio URL for an episode
 */
export const getEpisodeAudioUrl = async (episodeSlug, lang) => {
  try {
    const { data, error } = await supabase
      .from('episode_audios')
      .select('audio_url')
      .eq('episode_slug', episodeSlug)
      .eq('lang', lang)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    // Fallback to any language
    if (!data) {
      const { data: fallback } = await supabase
        .from('episode_audios')
        .select('audio_url')
        .eq('episode_slug', episodeSlug)
        .limit(1)
        .single();
      return fallback?.audio_url || null;
    }
    
    return data?.audio_url || null;
  } catch (error) {
    console.error('Error fetching episode audio URL:', error);
    return null;
  }
};

// ---- Helpers ----

function generateSlug(title, episodeSlug, questionId) {
  // Create a URL-friendly slug from title
  const base = title
    .toLowerCase()
    .replace(/[а-яёА-ЯЁ]/g, char => {
      const map = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh',
        'з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o',
        'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts',
        'ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
      };
      return map[char.toLowerCase()] || char;
    })
    .replace(/[ñ]/g, 'n')
    .replace(/[áéíóú]/g, (c) => ({ 'á':'a','é':'e','í':'i','ó':'o','ú':'u' }[c] || c))
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60)
    .replace(/-$/, '');

  // Add episode reference for uniqueness
  const suffix = episodeSlug ? `-${episodeSlug}` : `-q${questionId}`;
  return `${base}${suffix}`;
}
