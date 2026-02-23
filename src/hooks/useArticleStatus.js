import { useState, useEffect } from 'react';
import { getArticleStatusesByEpisode } from '@/services/articleService';

/**
 * Hook to batch-load article statuses for all questions of an episode.
 * Returns a map: { [question_id]: { articleId, slug, status } }
 */
const useArticleStatus = (episodeSlug) => {
  const [articleStatuses, setArticleStatuses] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!episodeSlug) return;

    let cancelled = false;

    const fetchStatuses = async () => {
      setLoading(true);
      const statuses = await getArticleStatusesByEpisode(episodeSlug);
      if (!cancelled) {
        setArticleStatuses(statuses);
        setLoading(false);
      }
    };

    fetchStatuses();

    return () => { cancelled = true; };
  }, [episodeSlug]);

  const refreshStatuses = async () => {
    if (!episodeSlug) return;
    const statuses = await getArticleStatusesByEpisode(episodeSlug);
    setArticleStatuses(statuses);
  };

  return { articleStatuses, loading, refreshStatuses };
};

export default useArticleStatus;
