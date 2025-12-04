import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getLocaleString } from '@/lib/locales';
import EpisodesList from '@/components/episodes/EpisodesList';
import FilterAndSearchControls from '@/components/episodes/FilterAndSearchControls';
import EmptyState from '@/components/episodes/EmptyState';

const ITEMS_PER_PAGE = 20;
const CACHE_KEY_PREFIX = 'dosmundos_episodes_cache_';

// Skeleton component for loading state
const EpisodeSkeleton = () => (
  <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30 mb-4 animate-pulse h-[120px]">
    <div className="h-6 bg-slate-700/50 rounded w-3/4 mb-3"></div>
    <div className="flex gap-4 mb-4">
      <div className="h-4 bg-slate-700/50 rounded w-20"></div>
      <div className="h-4 bg-slate-700/50 rounded w-24"></div>
    </div>
    <div className="space-y-2 pl-4 border-l-2 border-slate-700/30">
      <div className="h-3 bg-slate-700/30 rounded w-full"></div>
      <div className="h-3 bg-slate-700/30 rounded w-5/6"></div>
    </div>
  </div>
);

const InstantEpisodesPage = ({ currentLanguage }) => {
  const [episodes, setEpisodes] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [episodeQuestionsCount, setEpisodeQuestionsCount] = useState({});
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const observerTarget = useRef(null);
  const initialLoadDone = useRef(false);

  const monthLabels = [
    "january", "february", "march", "april", "may", "june", 
    "july", "august", "september", "october", "november", "december"
  ];

  // Load available years (lightweight query)
  useEffect(() => {
    const loadYears = async () => {
      const { data, error } = await supabase
        .from('episodes')
        .select('date')
        .order('date', { ascending: false });
      
      if (!error && data) {
        const years = new Set();
        data.forEach(ep => {
          if (ep.date) {
            years.add(new Date(ep.date).getFullYear().toString());
          }
        });
        setAvailableYears(Array.from(years).sort((a, b) => Number(b) - Number(a)));
      }
    };
    loadYears();
  }, []);

  // Helper to transform episode data
  const transformEpisodeData = useCallback((rawEpisodes) => {
    return rawEpisodes.map(ep => {
      const translations = ep.transcripts || [];
      const audios = ep.episode_audios || [];
      
      const titleObj = translations.find(t => t.lang === currentLanguage) 
                    || translations.find(t => t.lang === 'es') 
                    || translations[0];
      
      const audioObj = audios.find(a => a.lang === currentLanguage)
                    || audios.find(a => a.lang === 'es')
                    || audios.find(a => a.lang === 'mixed')
                    || audios[0];

      return {
        slug: ep.slug,
        date: ep.date,
        created_at: ep.created_at,
        title: titleObj?.title || ep.slug,
        translations: translations,
        lang: 'all',
        audio_url: audioObj?.audio_url,
        duration: audioObj?.duration || 0,
        available_variants: audios.map(a => a.lang)
      };
    });
  }, [currentLanguage]);

  // Fetch episodes with pagination and filters
  const fetchEpisodes = useCallback(async (pageToLoad, isReset = false) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('episodes')
        .select(`
          slug,
          date,
          created_at,
          transcripts (title, lang),
          episode_audios (audio_url, lang, duration)
        `)
        .order('date', { ascending: false });

      // Apply filters
      if (selectedYear) {
        const startDate = `${selectedYear}-01-01`;
        const endDate = `${selectedYear}-12-31`;
        
        if (selectedMonth) {
           // Calculate start and end of month
           const year = parseInt(selectedYear);
           const month = parseInt(selectedMonth) - 1; // 0-indexed
           const startOfMonth = new Date(year, month, 1);
           const endOfMonth = new Date(year, month + 1, 0);
           
           // Format as YYYY-MM-DD
           const formatDate = (d) => d.toISOString().split('T')[0];
           query = query.gte('date', formatDate(startOfMonth)).lte('date', formatDate(endOfMonth));
        } else {
           query = query.gte('date', startDate).lte('date', endDate);
        }
      }

      // Apply pagination
      const from = pageToLoad * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data: rawEpisodes, error: episodesError } = await query;

      if (episodesError) throw episodesError;

      const newEpisodes = transformEpisodeData(rawEpisodes);
      
      if (newEpisodes.length === 0) {
          if (isReset) {
              setEpisodes([]);
              setAllQuestions([]);
              setEpisodeQuestionsCount({});
          }
          setHasMore(false);
          setLoading(false);
          return;
      }

      // Split into priority (first 5) and background (rest)
      const priorityEpisodes = newEpisodes.slice(0, 5);
      const backgroundEpisodes = newEpisodes.slice(5);

      // 1. Fetch priority questions
      let priorityQuestions = [];
      try {
          const slugs = priorityEpisodes.map(e => e.slug);
          if (slugs.length > 0) {
              const { data } = await supabase
                .from('timecodes')
                .select('episode_slug, id, title, lang, time')
                .in('episode_slug', slugs)
                .eq('lang', currentLanguage)
                .order('time', { ascending: true });
              if (data) priorityQuestions = data;
          }
      } catch (e) { console.error('Priority questions fetch error', e); }

      // 2. Update state with ALL episodes but only PRIORITY questions
      setEpisodes(prev => {
        const updated = isReset ? newEpisodes : [...prev, ...newEpisodes];
        // Cache logic for first page
        if (pageToLoad === 0 && !selectedYear && !selectedMonth) {
          localStorage.setItem(`${CACHE_KEY_PREFIX}${currentLanguage}`, JSON.stringify({
            episodes: newEpisodes,
            questions: priorityQuestions, // Partial cache initially
            timestamp: Date.now()
          }));
        }
        return updated;
      });

      setAllQuestions(prev => {
        const existingIds = new Set(prev.map(q => `${q.episode_slug}-${q.id}-${q.lang}`));
        const uniqueNew = priorityQuestions.filter(q => !existingIds.has(`${q.episode_slug}-${q.id}-${q.lang}`));
        return isReset ? priorityQuestions : [...prev, ...uniqueNew];
      });

      setEpisodeQuestionsCount(prev => {
        const newCounts = isReset ? {} : { ...prev };
        // Initialize counts for ALL new episodes to 0 first (to avoid undefined)
        newEpisodes.forEach(ep => {
            if (!newCounts[ep.slug]) newCounts[ep.slug] = {};
            newCounts[ep.slug][currentLanguage] = 0;
        });
        // Update counts for priority episodes
        priorityEpisodes.forEach(ep => {
            const count = priorityQuestions.filter(q => q.episode_slug === ep.slug).length;
            newCounts[ep.slug][currentLanguage] = count;
        });
        return newCounts;
      });

      setHasMore(newEpisodes.length === ITEMS_PER_PAGE);
      setPage(pageToLoad + 1);
      setLoading(false); // UI is now interactive and showing content

      // 3. Fetch background questions
      if (backgroundEpisodes.length > 0) {
          try {
              const slugs = backgroundEpisodes.map(e => e.slug);
              const { data: backgroundQuestions } = await supabase
                .from('timecodes')
                .select('episode_slug, id, title, lang, time')
                .in('episode_slug', slugs)
                .eq('lang', currentLanguage)
                .order('time', { ascending: true });
              
              if (backgroundQuestions) {
                  // Update state with background questions
                  setAllQuestions(prev => {
                      const existingIds = new Set(prev.map(q => `${q.episode_slug}-${q.id}-${q.lang}`));
                      const uniqueNew = backgroundQuestions.filter(q => !existingIds.has(`${q.episode_slug}-${q.id}-${q.lang}`));
                      return [...prev, ...uniqueNew];
                  });

                  setEpisodeQuestionsCount(prev => {
                      const newCounts = { ...prev };
                      backgroundEpisodes.forEach(ep => {
                          const count = backgroundQuestions.filter(q => q.episode_slug === ep.slug).length;
                          if (!newCounts[ep.slug]) newCounts[ep.slug] = {};
                          newCounts[ep.slug][currentLanguage] = count;
                      });
                      return newCounts;
                  });

                  // Update cache with FULL data if first page
                  if (pageToLoad === 0 && !selectedYear && !selectedMonth) {
                      localStorage.setItem(`${CACHE_KEY_PREFIX}${currentLanguage}`, JSON.stringify({
                        episodes: newEpisodes,
                        questions: [...priorityQuestions, ...backgroundQuestions],
                        timestamp: Date.now()
                      }));
                  }
              }
          } catch (e) { console.error('Background questions fetch error', e); }
      }

    } catch (err) {
      console.error('Error fetching episodes:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [currentLanguage, selectedYear, selectedMonth, loading, transformEpisodeData]);

  // Initial load (Instant + Fresh)
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const loadInitial = async () => {
      // 1. Try to load from cache instantly
      const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${currentLanguage}`);
      if (cached && !selectedYear && !selectedMonth) {
        try {
          const { episodes: cachedEpisodes, questions: cachedQuestions } = JSON.parse(cached);
          if (cachedEpisodes && cachedEpisodes.length > 0) {
            setEpisodes(cachedEpisodes);
            setAllQuestions(cachedQuestions || []);
            
            // Update counts for cached data
            const counts = {};
            cachedEpisodes.forEach(ep => {
              const epQuestions = (cachedQuestions || []).filter(q => q.episode_slug === ep.slug);
              counts[ep.slug] = {};
              counts[ep.slug][currentLanguage] = epQuestions.length;
            });
            setEpisodeQuestionsCount(counts);
            setPage(1); // Assume we loaded page 0
          }
        } catch (e) {
          console.error('Error parsing cache', e);
        }
      }

      // 2. Fetch fresh data for page 0
      await fetchEpisodes(0, true);
    };

    loadInitial();
  }, [currentLanguage]); // Only run on mount or language change

  // Reset and reload when filters change
  useEffect(() => {
    if (!initialLoadDone.current) return; // Skip on initial mount as it's handled above
    
    setPage(0);
    setHasMore(true);
    setEpisodes([]);
    fetchEpisodes(0, true);
  }, [selectedYear, selectedMonth]); // Removed currentLanguage dependency to avoid double fetch

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchEpisodes(page, false);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, page, fetchEpisodes]);

  // Available months for filter
  const availableMonths = useMemo(() => {
    if (selectedYear) {
       return monthLabels.map((label, index) => ({
         value: (index + 1).toString(),
         labelKey: label
       }));
    }
    return [];
  }, [selectedYear]);

  const handleResetFilters = () => {
    setSelectedYear(null);
    setSelectedMonth(null);
  };

  return (
    <div className="container mx-auto p-2 sm:p-4 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
          {getLocaleString('episodes', currentLanguage)}
        </h1>
      </div>
      
      <FilterAndSearchControls
        years={availableYears}
        months={availableMonths}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        currentLanguage={currentLanguage}
        onResetFilters={handleResetFilters}
      />

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg mb-6">
          <h3 className="font-bold">Error loading episodes:</h3>
          <p>{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2 border-red-500/50 hover:bg-red-500/20"
            onClick={() => fetchEpisodes(page, false)}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Show Skeletons if loading initial data and no episodes yet */}
      {loading && episodes.length === 0 && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <EpisodeSkeleton key={i} />)}
        </div>
      )}

      <EpisodesList 
        episodes={episodes} 
        currentLanguage={currentLanguage} 
        episodeQuestionsCount={episodeQuestionsCount}
        allQuestions={allQuestions}
      />

      {/* Loading indicator / Sentinel */}
      <div ref={observerTarget} className="h-10 flex justify-center items-center mt-4">
        {loading && episodes.length > 0 && <Loader2 className="h-6 w-6 animate-spin text-purple-400" />}
        {!hasMore && episodes.length > 0 && (
          <p className="text-gray-500 text-sm">{getLocaleString('noMoreEpisodes', currentLanguage) || 'No more episodes'}</p>
        )}
        {episodes.length === 0 && !loading && !error && (
           <EmptyState currentLanguage={currentLanguage} isLoading={false} />
        )}
      </div>
    </div>
  );
};

export default InstantEpisodesPage;
