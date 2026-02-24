import { useState, useEffect, useCallback } from 'react';
import { getArticlesByEpisode } from '@/services/articleService';
import { supabase } from '@/lib/supabaseClient';

/**
 * Hook to get article statuses for all questions in an episode.
 * Maps timecode IDs to article statuses for showing icons on QuestionBlock.
 * 
 * @param {string} episodeSlug
 * @param {string} lang - Language code to filter timecodes (must match the questions displayed)
 * @returns {{ articleStatuses: Object, refreshStatuses: Function }}
 *   articleStatuses: { [timecodeId]: { status: 'draft'|'pending'|'published', slug: string } }
 */
const useArticleStatus = (episodeSlug, lang) => {
  const [articleStatuses, setArticleStatuses] = useState({});

  const refreshStatuses = useCallback(async () => {
    if (!episodeSlug) {
      setArticleStatuses({});
      return;
    }

    try {
      // 1. Get all articles for this episode
      const { data: articles } = await getArticlesByEpisode(episodeSlug);
      if (!articles || articles.length === 0) {
        setArticleStatuses({});
        return;
      }

      // 2. Get timecodes for this episode filtered by lang
      //    so IDs match the question IDs displayed in QuestionsManager
      let query = supabase
        .from('timecodes')
        .select('id, time')
        .eq('episode_slug', episodeSlug);
      
      if (lang) {
        query = query.eq('lang', lang);
      }

      const { data: timecodes, error } = await query;

      if (error) {
        console.error('[useArticleStatus] Error fetching timecodes:', error);
        setArticleStatuses({});
        return;
      }

      // 3. Match articles to timecodes by question_time === time
      const statusMap = {};
      for (const article of articles) {
        if (article.question_time == null) continue;
        // Use loose equality (==) to handle int vs float type mismatches
        const matchingTimecodes = timecodes?.filter(tc => Number(tc.time) === Number(article.question_time)) || [];
        for (const tc of matchingTimecodes) {
          statusMap[tc.id] = {
            status: article.status || 'draft',
            slug: article.slug
          };
        }
      }

      setArticleStatuses(statusMap);
    } catch (err) {
      console.error('[useArticleStatus] Error:', err);
      setArticleStatuses({});
    }
  }, [episodeSlug, lang]);

  useEffect(() => {
    refreshStatuses();
  }, [refreshStatuses]);

  return { articleStatuses, refreshStatuses };
};

export default useArticleStatus;
