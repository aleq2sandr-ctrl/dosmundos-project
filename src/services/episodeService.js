import { supabase } from '@/lib/supabaseClient';

/**
 * Service for managing episodes.
 * Abstracts the database schema from the application logic.
 */
export const episodeService = {
  /**
   * Fetches all episodes ordered by date.
   * @returns {Promise<{data: any[], error: any}>}
   */
  async getAllEpisodes() {
    // Fetch episodes with their audios and translations
    const { data, error } = await supabase
      .from('episodes')
      .select(`
        slug,
        date,
        created_at,
        episode_audios (
          lang,
          audio_url,
          duration
        ),
        episode_translations (
          lang,
          title
        )
      `)
      .order('date', { ascending: false });

    if (error) return { data: null, error };

    return { data, error };
  },

  /**
   * Fetches a single episode by slug and language.
   * @param {string} slug 
   * @param {string} lang 
   * @returns {Promise<{data: any, error: any}>}
   */
  async getEpisode(slug, lang) {
    let query = supabase
      .from('episodes')
      .select(`
        slug,
        date,
        created_at,
        episode_audios (
          lang,
          audio_url,
          duration
        ),
        episode_translations (
          lang,
          title
        )
      `)
      .eq('slug', slug);
    
    const { data, error } = await query.maybeSingle();
    
    if (error) return { data: null, error };
    if (!data) return { data: null, error: null };

    // If a specific language was requested, we can filter the nested arrays in memory
    // (Supabase doesn't support filtering nested relations easily in the select string without complex syntax)
    if (lang) {
      data.episode_audios = data.episode_audios.filter(v => v.lang === lang || v.lang === 'mixed');
      data.episode_translations = data.episode_translations.filter(v => v.lang === lang);
    }
    
    return { data, error };
  },

  /**
   * Creates or updates an episode.
   * @param {Object} episodeData 
   * @returns {Promise<{data: any, error: any}>}
   */
  async upsertEpisode(episodeData) {
    // 1. Upsert the main episode (date, slug)
    const { error: epError } = await supabase
      .from('episodes')
      .upsert({
        slug: episodeData.slug,
        date: episodeData.date,
        updated_at: new Date().toISOString()
      }, { onConflict: 'slug' });

    if (epError) return { data: null, error: epError };

    // 2. Upsert the translation (title, lang)
    if (episodeData.title) {
      const { error: transError } = await supabase
        .from('episode_translations')
        .upsert({
          episode_slug: episodeData.slug,
          lang: episodeData.lang,
          title: episodeData.title,
          updated_at: new Date().toISOString()
        }, { onConflict: 'episode_slug,lang' });
        
      if (transError) console.error('Error upserting translation:', transError);
    }

    // 3. Upsert the audio (audio_url, lang)
    if (episodeData.audio_url) {
      const { error: audioError } = await supabase
        .from('episode_audios')
        .upsert({
          episode_slug: episodeData.slug,
          lang: episodeData.lang, // Note: Caller should handle 'mixed' logic if needed
          audio_url: episodeData.audio_url
        }, { onConflict: 'episode_slug,lang' });

      if (audioError) console.error('Error upserting audio:', audioError);
    }

    return { data: { success: true }, error: null };
  }
};
