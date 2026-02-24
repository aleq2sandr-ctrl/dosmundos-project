import { supabase } from '@/lib/supabaseClient';
import { saveEditToHistory } from '@/services/editHistoryService';

export const ARTICLE_SUPPORTED_LANGUAGES = ['ru', 'es', 'en', 'de', 'fr', 'pl'];

/**
 * Service for managing articles.
 * Handles CRUD operations and relationship with questions/episodes.
 */

/**
 * Cyrillic → Latin transliteration map (Russian/Ukrainian)
 */
const TRANSLIT_MAP = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  'і': 'i', 'ї': 'yi', 'є': 'ye', 'ґ': 'g',
  // Spanish accented characters
  'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n', 'ü': 'u',
};

const transliterate = (str) =>
  str.split('').map(ch => {
    const lower = ch.toLowerCase();
    const mapped = TRANSLIT_MAP[lower];
    if (mapped !== undefined) return mapped;
    return lower;
  }).join('');

/**
 * Generate a URL-friendly slug from a title.
 * Transliterates Cyrillic and accented characters to Latin.
 */
export const generateSlug = (title, date) => {
  const transliterated = transliterate((title || 'untitled').toLowerCase());
  const base = transliterated
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .substring(0, 60);
  const dateStr = date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const rnd = Math.random().toString(36).substring(2, 6);
  return `${base}-${dateStr}-${rnd}`;
};

/**
 * Sanitize a user-edited slug: transliterate and clean.
 */
export const sanitizeSlug = (input) =>
  transliterate((input || '').toLowerCase())
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);

/**
 * Get the date of an episode by slug
 */
export const getEpisodeDate = async (episodeSlug) => {
  try {
    const { data, error } = await supabase
      .from('episodes')
      .select('date')
      .eq('slug', episodeSlug)
      .maybeSingle();

    if (error) throw error;
    return data?.date || null;
  } catch (error) {
    console.error('[articleService] Error fetching episode date:', error);
    return null;
  }
};

/**
 * Get the audio URL for an episode in a given language.
 * Fallback chain: requested lang → mixed → ru → any available.
 */
export const getEpisodeAudioUrl = async (episodeSlug, lang) => {
  try {
    // Build fallback chain
    const langChain = [lang];
    if (lang !== 'mixed') langChain.push('mixed');
    if (lang !== 'ru' && !langChain.includes('ru')) langChain.push('ru');

    for (const tryLang of langChain) {
      const { data, error } = await supabase
        .from('episode_audios')
        .select('audio_url')
        .eq('episode_slug', episodeSlug)
        .eq('lang', tryLang)
        .maybeSingle();

      if (error) throw error;
      if (data?.audio_url) return data.audio_url;
    }

    // Last resort: any available audio for this episode
    const { data: any } = await supabase
      .from('episode_audios')
      .select('audio_url')
      .eq('episode_slug', episodeSlug)
      .limit(1)
      .maybeSingle();

    return any?.audio_url || null;
  } catch (error) {
    console.error('[articleService] Error fetching episode audio URL:', error);
    return null;
  }
};

/**
 * Create a draft article from a question
 */
export const createDraftFromQuestion = async ({
  episodeSlug,
  questionTime,
  questionEndTime,
  title,
  lang,
  transcriptHtml,
  editor
}) => {
  const startTime = Date.now();
  try {
    console.log('[articleService] createDraftFromQuestion called', {
      episodeSlug, questionTime, questionEndTime, titleLength: title?.length, lang
    });
    
    const slug = generateSlug(title, new Date());

    const articleRow = {
      slug,
      status: 'draft',
      author: editor?.name || 'Editor',
      created_at: new Date().toISOString()
    };
    if (episodeSlug) articleRow.episode_slug = episodeSlug;
    if (questionTime != null) articleRow.question_time = Number(questionTime);
    if (questionEndTime != null) articleRow.question_end_time = Number(questionEndTime);

    console.log('[articleService] Creating article row:', articleRow);

    const { data: article, error: articleError } = await supabase
      .from('articles_v2')
      .insert(articleRow)
      .select()
      .single();

    if (articleError) {
      console.error('[articleService] articles_v2 insert error:', articleError);
      throw articleError;
    }

    console.log('[articleService] Article created successfully:', article);

    const { error: transError } = await supabase
      .from('article_translations')
      .insert({
        article_id: article.id,
        language_code: lang,
        title: title || '',
        summary: '',
        content: transcriptHtml || ''
      });

    if (transError) {
      console.error('[articleService] article_translations insert error:', transError);
      throw transError;
    }

    const duration = Date.now() - startTime;
    console.log('[articleService] createDraftFromQuestion completed in', duration, 'ms');

    return { success: true, data: { slug: article.slug, id: article.id } };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[articleService] Error creating draft:', error);
    console.error('[articleService] Error details:', {
      message: error.message,
      code: error.code,
      duration: `${duration}ms`,
      stack: error.stack
    });
    return { success: false, error: error.message };
  }
};

/**
 * Get a single article by slug with translations and categories
 */
export const getArticle = async (slug, lang) => {
  try {
    const { data, error } = await supabase
      .from('articles_v2')
      .select(`
        *,
        article_translations(title, summary, content, language_code),
        article_categories(
          category_id,
          categories(
            id, slug,
            category_translations(name, language_code)
          )
        )
      `)
      .eq('slug', slug)
      .single();

    if (error) throw error;

    const translations = data.article_translations || [];
    const exactTranslation = translations.find(t => t.language_code === lang);
    const translation = exactTranslation ||
                        translations.find(t => t.language_code === 'ru') || {};
    const isFallbackTranslation = !exactTranslation && !!translation.language_code;

    const categories = (data.article_categories || []).map(ac => {
      const catTrans = ac.categories?.category_translations || [];
      const t = catTrans.find(ct => ct.language_code === lang) ||
                catTrans.find(ct => ct.language_code === 'ru');
      return {
        id: ac.categories?.id,
        slug: ac.categories?.slug,
        name: t?.name || ac.categories?.slug
      };
    }).filter(Boolean);

    return {
      success: true,
      data: {
        id: data.id,
        slug: data.slug,
        status: data.status || 'draft',
        author: data.author,
        youtubeUrl: data.youtube_url,
        imageUrl: data.image_url,
        publishedAt: data.published_at,
        createdAt: data.created_at,
        episodeSlug: data.episode_slug,
        questionTime: data.question_time,
        questionEndTime: data.question_end_time,
        title: translation.title || '',
        summary: translation.summary || '',
        content: translation.content || '',
        lang: translation.language_code || lang,
        isFallbackTranslation,
        fallbackLang: isFallbackTranslation ? translation.language_code : null,
        categories,
        allTranslations: translations
      }
    };
  } catch (error) {
    console.error('[articleService] Error fetching article:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save / update an article
 */
export const saveArticle = async (slug, {
  title, summary, content, status, categories,
  imageUrl, youtubeUrl, lang, publishedAt
}, editor) => {
  const startTime = Date.now();
  try {
    console.log('[articleService] saveArticle called', {
      slug, titleLength: title?.length, contentLength: content?.length,
      status, categoriesCount: categories?.length || 0, lang
    });

    const updateData = {
      status: status || 'draft',
      youtube_url: youtubeUrl || null,
      image_url: imageUrl || null,
      author: editor?.name || 'Editor'
    };

    if (status === 'published' && !publishedAt) {
      updateData.published_at = new Date().toISOString();
    } else if (status !== 'published') {
      // Clear published_at when moving away from published
      updateData.published_at = null;
    } else if (publishedAt) {
      updateData.published_at = publishedAt;
    }

    const runArticleUpdate = async (payload) => {
      return supabase
        .from('articles_v2')
        .update(payload)
        .eq('slug', slug)
        .select()
        .single();
    };

    let { data: article, error: articleError } = await runArticleUpdate(updateData);

    if (articleError && String(articleError.message || '').includes('image_url')) {
      console.warn('[articleService] articles_v2.image_url column is missing; retrying save without image_url');
      const fallbackUpdateData = { ...updateData };
      delete fallbackUpdateData.image_url;
      const fallback = await runArticleUpdate(fallbackUpdateData);
      article = fallback.data;
      articleError = fallback.error;
    }

    if (articleError) throw articleError;

    console.log('[articleService] Article updated successfully:', article);

    const { error: transError } = await supabase
      .from('article_translations')
      .upsert({
        article_id: article.id,
        language_code: lang,
        title: title || '',
        summary: summary || '',
        content: content || ''
      }, { onConflict: 'article_id, language_code' });

    if (transError) {
      console.error('[articleService] article_translations upsert error:', transError);
      throw transError;
    }

    console.log('[articleService] Translation upserted successfully');

    if (Array.isArray(categories)) {
      await supabase.from('article_categories').delete().eq('article_id', article.id);
      if (categories.length > 0) {
        await supabase.from('article_categories').insert(
          categories.map(catId => ({ article_id: article.id, category_id: catId }))
        );
        console.log('[articleService] Categories updated:', categories.length, 'categories');
      }
    }

    if (editor) {
      await saveEditToHistory({
        editorId: editor.id,
        editorEmail: editor.email,
        editorName: editor.name,
        editType: 'article_edit',
        targetType: 'article',
        targetId: slug,
        contentBefore: '',
        contentAfter: JSON.stringify({ title, summary, status }),
        metadata: { lang, status }
      });
    }

    const duration = Date.now() - startTime;
    console.log('[articleService] saveArticle completed in', duration, 'ms');

    return { success: true, data: { slug: article.slug, id: article.id, status: article.status } };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[articleService] Error saving article:', error);
    console.error('[articleService] Error details:', {
      message: error.message,
      code: error.code,
      duration: `${duration}ms`,
      stack: error.stack
    });
    return { success: false, error: error.message };
  }
};

/**
 * Get translation coverage for an article (which languages already exist).
 */
export const getArticleTranslationStatuses = async (slug) => {
  try {
    const { data: article, error: articleError } = await supabase
      .from('articles_v2')
      .select('id, slug')
      .eq('slug', slug)
      .single();

    if (articleError) throw articleError;

    const { data: translations, error: translationsError } = await supabase
      .from('article_translations')
      .select('language_code')
      .eq('article_id', article.id);

    if (translationsError) throw translationsError;

    const translated = new Set((translations || []).map(t => t.language_code));
    const statusByLang = ARTICLE_SUPPORTED_LANGUAGES.reduce((acc, code) => {
      acc[code] = translated.has(code);
      return acc;
    }, {});

    return {
      success: true,
      data: {
        articleId: article.id,
        slug: article.slug,
        statusByLang,
        translatedLanguages: Object.keys(statusByLang).filter(code => statusByLang[code])
      }
    };
  } catch (error) {
    console.error('[articleService] Error getting translation statuses:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Ensure article has a translation row for the provided language.
 * Useful for older articles to keep translation updates linked by article_id.
 */
export const ensureArticleTranslationLink = async (slug, { lang, title, summary, content }) => {
  try {
    const { data: article, error: articleError } = await supabase
      .from('articles_v2')
      .select('id')
      .eq('slug', slug)
      .single();

    if (articleError) throw articleError;

    const { data: existing, error: existingError } = await supabase
      .from('article_translations')
      .select('article_id, language_code')
      .eq('article_id', article.id)
      .eq('language_code', lang)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) return { success: true, created: false };

    const { error: insertError } = await supabase
      .from('article_translations')
      .insert({
        article_id: article.id,
        language_code: lang,
        title: title || '',
        summary: summary || '',
        content: content || ''
      });

    if (insertError) throw insertError;
    return { success: true, created: true };
  } catch (error) {
    console.error('[articleService] Error ensuring translation link:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save translated text to target language for the same article.
 * If overwrite=false and translation exists, returns exists=true.
 */
export const saveArticleTranslation = async (slug, {
  sourceLang,
  targetLang,
  title,
  summary,
  content,
  overwrite = false,
  editor
}) => {
  try {
    const { data: article, error: articleError } = await supabase
      .from('articles_v2')
      .select('id, slug')
      .eq('slug', slug)
      .single();

    if (articleError) throw articleError;

    const { data: existing, error: existingError } = await supabase
      .from('article_translations')
      .select('article_id, language_code')
      .eq('article_id', article.id)
      .eq('language_code', targetLang)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing && !overwrite) {
      return { success: false, exists: true, error: 'Translation already exists' };
    }

    const { error: upsertError } = await supabase
      .from('article_translations')
      .upsert({
        article_id: article.id,
        language_code: targetLang,
        title: title || '',
        summary: summary || '',
        content: content || ''
      }, { onConflict: 'article_id,language_code' });

    if (upsertError) throw upsertError;

    if (editor) {
      await saveEditToHistory({
        editorId: editor.id,
        editorEmail: editor.email,
        editorName: editor.name,
        editType: 'article_translation',
        targetType: 'article',
        targetId: slug,
        contentBefore: '',
        contentAfter: JSON.stringify({ sourceLang, targetLang, overwrite }),
        metadata: { sourceLang, targetLang, overwrite }
      });
    }

    return { success: true, data: { slug: article.slug, targetLang } };
  } catch (error) {
    console.error('[articleService] Error saving article translation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update the slug of an existing article.
 * Returns the new slug on success.
 */
export const updateArticleSlug = async (oldSlug, newSlug) => {
  try {
    const { data, error } = await supabase
      .from('articles_v2')
      .update({ slug: newSlug })
      .eq('slug', oldSlug)
      .select('slug')
      .single();
    if (error) throw error;
    return { success: true, slug: data.slug };
  } catch (error) {
    console.error('[articleService] Error updating slug:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all articles linked to an episode (for useArticleStatus)
 */
export const getArticlesByEpisode = async (episodeSlug) => {
  try {
    const { data, error } = await supabase
      .from('articles_v2')
      .select('id, slug, status, question_time, question_end_time')
      .eq('episode_slug', episodeSlug);

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('[articleService] Error fetching articles by episode:', error);
    return { success: false, data: [], error: error.message };
  }
};

/**
 * Get all categories with translations
 */
export const getCategories = async (lang) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, slug, category_translations(name, language_code)');

    if (error) throw error;

    return {
      success: true,
      data: (data || []).map(cat => {
        const t = cat.category_translations?.find(ct => ct.language_code === lang) ||
                  cat.category_translations?.find(ct => ct.language_code === 'ru');
        return { id: cat.id, slug: cat.slug, name: t?.name || cat.slug };
      })
    };
  } catch (error) {
    console.error('[articleService] Error fetching categories:', error);
    return { success: false, data: [], error: error.message };
  }
};

/**
 * Delete an article
 */
export const deleteArticle = async (slug) => {
  try {
    const { error } = await supabase.from('articles_v2').delete().eq('slug', slug);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('[articleService] Error deleting article:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get transcript utterances for a question's time range.
 * Falls back through: edited_transcript_data → transcript_data,
 * and through languages: requested lang → mixed → ru → any available.
 */
export const getQuestionTranscript = async (episodeSlug, lang, startTime, endTime) => {
  try {
    const queryLang = lang || 'mixed';
    console.log('[articleService] getQuestionTranscript:', { episodeSlug, queryLang, startTime, endTime });

    // Build fallback chain: requested lang → mixed → ru → any
    const langChain = [queryLang];
    if (queryLang !== 'mixed') langChain.push('mixed');
    if (queryLang !== 'ru' && !langChain.includes('ru')) langChain.push('ru');

    let data = null;

    // Try each language in the fallback chain
    for (const tryLang of langChain) {
      const { data: result, error } = await supabase
        .from('transcripts')
        .select('edited_transcript_data, transcript_data')
        .eq('episode_slug', episodeSlug)
        .eq('lang', tryLang)
        .maybeSingle();

      if (error) throw error;
      if (result) {
        data = result;
        if (tryLang !== queryLang) {
          console.log(`[articleService] getQuestionTranscript: using fallback lang '${tryLang}' (requested '${queryLang}')`);
        }
        break;
      }
    }

    // Last resort: try any available transcript for this episode
    if (!data) {
      const { data: any, error: anyErr } = await supabase
        .from('transcripts')
        .select('edited_transcript_data, transcript_data, lang')
        .eq('episode_slug', episodeSlug)
        .limit(1)
        .maybeSingle();

      if (anyErr) throw anyErr;
      if (any) {
        data = any;
        console.log(`[articleService] getQuestionTranscript: using any available lang '${any.lang}' (requested '${queryLang}')`);
      }
    }

    // Prefer edited_transcript_data, fall back to transcript_data
    const utterances = data?.edited_transcript_data?.utterances
      || data?.transcript_data?.utterances;

    if (!utterances || !Array.isArray(utterances)) return { success: true, data: [] };

    const startMs = (startTime || 0) * 1000;
    const endMs = endTime ? endTime * 1000 : Infinity;

    const filtered = utterances
      .filter(u => typeof u.start === 'number' && u.start >= startMs && u.start < endMs)
      .sort((a, b) => a.start - b.start);

    return { success: true, data: filtered };
  } catch (error) {
    console.error('[articleService] Error fetching question transcript:', error);
    return { success: false, data: [], error: error.message };
  }
};
