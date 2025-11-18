import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const useSupabaseSubscriptions = (
  episodeSlug,
  episodeData,
  currentLanguage,
  fetchQuestionsForEpisode,
  fetchTranscriptForEpisode,
  isOfflineMode = false
) => {
  useEffect(() => {
    if (!episodeSlug) return;
    // Не подписываемся на изменения в офлайн режиме
    if (isOfflineMode || (typeof navigator !== 'undefined' && !navigator.onLine)) return;

    let questionsChannel = null;
    let transcriptsChannel = null;

    try {
      questionsChannel = supabase.channel(`db-questions-changes-for-${episodeSlug}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'questions', filter: `episode_slug=eq.${episodeSlug}` }, 
          (payload) => {
            const langForContent = episodeData?.lang === 'all' ? currentLanguage : episodeData?.lang;
            if (langForContent && payload.new?.lang === langForContent) {
              fetchQuestionsForEpisode(episodeSlug, langForContent);
            }
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.debug('Questions channel subscription error:', err.message);
          }
        });

      transcriptsChannel = supabase.channel(`db-transcripts-changes-for-${episodeSlug}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'transcripts', filter: `episode_slug=eq.${episodeSlug}` },
          (payload) => {
            const langForContent = episodeData?.lang === 'all' ? currentLanguage : episodeData?.lang;
            const eventType = payload.eventType || payload.event;
            const newLang = payload.new?.lang;
            const oldLang = payload.old?.lang;
            if (!langForContent) return;
            const matchesLang = newLang === langForContent || oldLang === langForContent;
            if (!matchesLang) return;
            // Avoid heavy refetch on frequent UPDATEs during editing; refetch on INSERT/DELETE or status change
            if (eventType === 'INSERT' || eventType === 'DELETE') {
              fetchTranscriptForEpisode(episodeSlug, langForContent);
            } else if (eventType === 'UPDATE') {
              const prevStatus = payload.old?.status;
              const newStatus = payload.new?.status;
              if (prevStatus !== newStatus) {
                fetchTranscriptForEpisode(episodeSlug, langForContent);
              }
            }
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.debug('Transcripts channel subscription error:', err.message);
          }
        });
    } catch (error) {
      console.debug('Error setting up realtime subscriptions:', error.message);
    }

    return () => {
      try {
        if (questionsChannel) {
          supabase.removeChannel(questionsChannel);
        }
        if (transcriptsChannel) {
          supabase.removeChannel(transcriptsChannel);
        }
      } catch (error) {
        console.debug('Error removing channels:', error.message);
      }
    };
  }, [episodeSlug, episodeData, currentLanguage, fetchQuestionsForEpisode, fetchTranscriptForEpisode, isOfflineMode]);
};

export default useSupabaseSubscriptions;