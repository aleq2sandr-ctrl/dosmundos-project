import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getLocaleString } from '@/lib/locales';
import EpisodesList from '@/components/episodes/EpisodesList';
import FilterAndSearchControls from '@/components/episodes/FilterAndSearchControls';
import EmptyState from '@/components/episodes/EmptyState';
import cacheIntegration from '@/lib/cacheIntegration';

const InstantEpisodesPage = ({ currentLanguage, onLanguageChange }) => {
  const [episodes, setEpisodes] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [loading, setLoading] = useState(false); // Только для индикатора обновления
  const [error, setError] = useState(null);
  const [episodeQuestionsCount, setEpisodeQuestionsCount] = useState({});

  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const monthLabels = [
    "january", "february", "march", "april", "may", "june", 
    "july", "august", "september", "october", "november", "december"
  ];

  const hasInitialized = useRef(false);

  // Обработка данных эпизодов
  const processEpisodesData = useCallback(async (episodesData, fromCache = false, questionsData = null) => {
    // Re-map episodes to update title based on currentLanguage if translations exist
    const processedEpisodes = episodesData.map(ep => {
        if (ep.translations && Array.isArray(ep.translations)) {
            const titleObj = ep.translations.find(t => t.lang === currentLanguage) 
                          || ep.translations.find(t => t.lang === 'es') 
                          || ep.translations[0];
            return {
                ...ep,
                title: titleObj?.title || ep.title
            };
        }
        return ep;
    });

    const langFilteredEpisodes = processedEpisodes.filter(ep => 
      ep.lang === currentLanguage || ep.lang === 'all'
    );
    
    // Если вопросы не переданы и данные из кэша, загружаем вопросы в фоне
    if (!questionsData && fromCache) {
      // Сразу показываем эпизоды без вопросов
      const counts = {};
      const years = new Set();
      langFilteredEpisodes.forEach(ep => {
        if (ep.date) {
          years.add(new Date(ep.date).getFullYear().toString());
        }
        counts[ep.slug] = counts[ep.slug] || {};
        ['ru', 'es', 'en', 'de', 'fr', 'pl'].forEach(lang => {
          counts[ep.slug][lang] = 0; // Временно 0, обновим позже
        });
      });
      
      setAvailableYears(Array.from(years).sort((a,b) => Number(b) - Number(a)));
      setEpisodeQuestionsCount(counts);
      setEpisodes(langFilteredEpisodes);
      setAllQuestions([]);

      // Загружаем вопросы в фоне
      loadQuestionsInBackground(langFilteredEpisodes);
      
      console.log('✅ Data processed instantly (episodes only):', {
        episodes: langFilteredEpisodes.length,
        fromCache
      });
      return;
    }

    // Если вопросы переданы, обрабатываем полные данные
    const counts = {};
    const years = new Set();
    langFilteredEpisodes.forEach(ep => {
      if (ep.date) {
        years.add(new Date(ep.date).getFullYear().toString());
      }
      counts[ep.slug] = counts[ep.slug] || {};
      ['ru', 'es', 'en', 'de', 'fr', 'pl'].forEach(lang => {
         const episodeQuestions = (questionsData || []).filter(q => 
           q.episode_slug === ep.slug && 
           q.lang === lang && 
           (q.is_intro || q.is_full_transcript || q.id === 'intro-virtual' || (q.title && q.title.trim() !== ''))
         );
         // Сортируем вопросы по времени
         episodeQuestions.sort((a, b) => (a.time || 0) - (b.time || 0));
         counts[ep.slug][lang] = episodeQuestions.length;
      });
    });
    
    setAvailableYears(Array.from(years).sort((a,b) => Number(b) - Number(a)));
    setEpisodeQuestionsCount(counts);
    setEpisodes(langFilteredEpisodes);
    setAllQuestions(questionsData || []);

    console.log('✅ Data processed instantly (full):', {
      episodes: langFilteredEpisodes.length,
      questions: (questionsData || []).length,
      fromCache
    });
  }, [currentLanguage]);

  // Загрузка свежих данных
  const loadFreshData = useCallback(async () => {
    setLoading(true);
    
    try {
      console.log('🔍 [InstantEpisodesPage] Загрузка данных из Supabase...');
      
      // V3: Fetch from episodes with joins
      const { data: rawEpisodes, error: episodesError } = await supabase
        .from('episodes')
        .select(`
          slug,
          date,
          created_at,
          episode_translations (
            title,
            lang
          ),
          episode_audios (
            audio_url,
            lang,
            duration
          )
        `)
        .order('date', { ascending: false });

      console.log('📊 [InstantEpisodesPage] Результат запроса episodes:', { 
        dataCount: rawEpisodes?.length || 0, 
        error: episodesError,
        data: rawEpisodes?.slice(0, 3)
      });

      if (episodesError) throw episodesError;

      // Transform V3 data to flat structure for compatibility
      const episodesData = rawEpisodes.map(ep => {
        const translations = ep.episode_translations || [];
        const audios = ep.episode_audios || [];
        
        // Pick title: current language -> es -> first
        const titleObj = translations.find(t => t.lang === currentLanguage) 
                      || translations.find(t => t.lang === 'es') 
                      || translations[0];
        
        // Pick audio: current language -> es -> mixed -> first
        const audioObj = audios.find(a => a.lang === currentLanguage)
                      || audios.find(a => a.lang === 'es')
                      || audios.find(a => a.lang === 'mixed')
                      || audios[0];

        return {
            slug: ep.slug,
            date: ep.date,
            created_at: ep.created_at,
            title: titleObj?.title || ep.slug,
            translations: translations, // Store translations for dynamic language switching
            lang: 'all', // V3 episodes are language-agnostic containers
            audio_url: audioObj?.audio_url,
            duration: audioObj?.duration || 0,
            available_variants: audios.map(a => a.lang) // Helper for UI to show available langs
          };
      });
      
      // V3: Use timecodes table instead of questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('timecodes')
        .select('episode_slug, id, title, lang, time')
        .order('time', { ascending: true }); 
      
      console.log('📊 [InstantEpisodesPage] Результат запроса questions:', { 
        dataCount: questionsData?.length || 0, 
        error: questionsError
      });
      
      if (questionsError) throw questionsError;

      // Сохраняем в кэш
      await cacheIntegration.saveEpisodesPageData(episodesData, questionsData);

      await processEpisodesData(episodesData, false, questionsData);
      
    } catch (err) {
      console.error('❌ Error loading fresh data:', err);
      setError(getLocaleString('errorFetchingEpisodes', currentLanguage, { errorMessage: err.message }));
    } finally {
      setLoading(false);
    }
  }, [currentLanguage]);

  // Фоновая загрузка свежих данных
  const loadFreshDataInBackground = useCallback(async () => {
    try {
      // V3: Fetch from episodes with joins
      const { data: rawEpisodes, error: episodesError } = await supabase
        .from('episodes')
        .select(`
          slug,
          date,
          created_at,
          episode_translations (
            title,
            lang
          ),
          episode_audios (
            audio_url,
            lang,
            duration
          )
        `)
        .order('date', { ascending: false });

      if (!episodesError && rawEpisodes) {
        // Transform V3 data
        const episodesData = rawEpisodes.map(ep => {
          const translations = ep.episode_translations || [];
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
            translations: translations, // Store translations for dynamic language switching
            lang: 'all',
            audio_url: audioObj?.audio_url,
            duration: audioObj?.duration || 0,
            available_variants: audios.map(a => a.lang)
          };
        });

        // V3: Use timecodes table
        const { data: questionsData } = await supabase
          .from('timecodes')
          .select('episode_slug, id, title, lang, time')
          .order('time', { ascending: true });

        // Обновляем кэш в фоне
        await cacheIntegration.saveEpisodesPageData(episodesData, questionsData);
        
        // Обновляем UI если данные изменились
        if (episodesData.length !== episodes.length) {
          await processEpisodesData(episodesData, false, questionsData);
        }
        
        console.log('🔄 Background data refresh completed');
      }
    } catch (err) {
      console.debug('Background refresh failed:', err);
    }
  }, [currentLanguage, episodes.length, processEpisodesData]);

  // Фоновая загрузка вопросов
  const loadQuestionsInBackground = async (episodesList) => {
    try {
      const allQuestions = [];

      for (const episode of episodesList) {
        for (const lang of ['ru', 'es', 'en', 'de', 'fr', 'pl']) {
          const cachedQuestions = await cacheIntegration.loadPlayerPageData(episode.slug, lang);
          if (cachedQuestions.questions) {
            allQuestions.push(...cachedQuestions.questions);
          }
        }
      }
      
      // Убираем дубликаты вопросов (по id + lang + episode_slug)
      const uniqueQuestions = allQuestions.filter((question, index, self) =>
        index === self.findIndex(q =>
          q.id === question.id &&
          q.lang === question.lang &&
          q.episode_slug === question.episode_slug
        )
      );

      // Обновляем счетчики вопросов
      updateQuestionsCount(episodesList, uniqueQuestions);
      setAllQuestions(uniqueQuestions);
      
      console.log('✅ Background questions loaded:', allQuestions.length);
    } catch (err) {
      console.debug('Background questions loading failed:', err);
    }
  };

  // Обновление счетчика вопросов
  const updateQuestionsCount = (episodesList, questionsList) => {
    const counts = {};
    episodesList.forEach(ep => {
      counts[ep.slug] = counts[ep.slug] || {};
      ['ru', 'es', 'en', 'de', 'fr', 'pl'].forEach(lang => {
         const episodeQuestions = (questionsList || []).filter(q => 
           q.episode_slug === ep.slug && 
           q.lang === lang && 
           (q.is_intro || q.is_full_transcript || q.id === 'intro-virtual' || (q.title && q.title.trim() !== ''))
         );
         // Сортируем вопросы по времени
         episodeQuestions.sort((a, b) => (a.time || 0) - (b.time || 0));
         counts[ep.slug][lang] = episodeQuestions.length;
      });
    });
    setEpisodeQuestionsCount(counts);
  };

  // Мгновенная загрузка данных - сначала показываем интерфейс, потом подгружаем данные
  const loadDataInstantly = useCallback(async () => {
    console.log('🚀 [InstantEpisodesPage] Instant loading started - showing UI immediately');
    console.log('🌐 [InstantEpisodesPage] Current language:', currentLanguage);
    
    try {
      // Сначала пытаемся загрузить из кэша мгновенно
      console.log('📦 [InstantEpisodesPage] Проверка кэша...');
      const cachedData = await cacheIntegration.loadEpisodesPageData(currentLanguage);
      
      console.log('📦 [InstantEpisodesPage] Результат кэша:', {
        hasData: !!cachedData,
        episodesCount: cachedData?.episodes?.length || 0,
        questionsCount: cachedData?.questions?.length || 0
      });
      
      if (cachedData && cachedData.episodes.length > 0) {
        console.log('📦 [InstantEpisodesPage] Using cached data instantly:', cachedData.episodes.length);
        await processEpisodesData(cachedData.episodes, true);
        
        // Загружаем свежие данные в фоне
        loadFreshDataInBackground();
        return;
      }

      // Если кэша нет, показываем пустой интерфейс и загружаем в фоне
      console.log('🔄 [InstantEpisodesPage] No cache found, loading fresh data in background');
      loadFreshData();
      
    } catch (err) {
      console.error('❌ [InstantEpisodesPage] Error in instant loading:', err);
      // Не показываем ошибку пользователю - просто логируем
    }
  }, [currentLanguage, loadFreshData, loadFreshDataInBackground, processEpisodesData]);

  // Основной эффект загрузки - запускается один раз
  useEffect(() => {
    if (!hasInitialized.current) {
      loadDataInstantly();
      hasInitialized.current = true;
    }

    const channel = supabase
      .channel('episodes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'episodes' }, () => {
        // Используем стабильную функцию для избежания бесконечных ререндеров
        loadFreshDataInBackground();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timecodes' }, () => {
        // Используем стабильную функцию для избежания бесконечных ререндеров
        loadFreshDataInBackground();
      })
      .subscribe((status, err) => {
        if (err) {
          console.debug('Realtime subscription error:', err.message);
        }
      });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.debug('Error removing channel:', error.message);
      }
    };
  }, [loadDataInstantly, loadFreshDataInBackground]);

  // Перезагрузка данных при смене языка
  useEffect(() => {
    if (hasInitialized.current) {
      // Сбрасываем фильтры по времени при смене языка
      setSelectedYear(null);
      setSelectedMonth(null);
      // Перезагружаем данные мгновенно для нового языка
      loadDataInstantly();
    }
  }, [currentLanguage, loadDataInstantly]);

  // Фильтрация по месяцам - используем useMemo для избежания бесконечных ререндеров
  const availableMonths = useMemo(() => {
    if (selectedYear && episodes.length > 0) {
      const months = new Set();
      episodes.forEach(ep => {
        if (ep.date && new Date(ep.date).getFullYear().toString() === selectedYear) {
          months.add(new Date(ep.date).getMonth());
        }
      });
      const sortedMonths = Array.from(months).sort((a,b) => a - b);
      return sortedMonths.map(m => ({ value: (m + 1).toString(), labelKey: monthLabels[m] }));
    }
    return [];
  }, [selectedYear, episodes.length, monthLabels]);
  
  const handleResetFilters = () => {
    setSelectedYear(null);
    setSelectedMonth(null);
  };

  const filteredEpisodes = useMemo(() => {
    let tempEpisodes = episodes;

    if (selectedYear) {
      tempEpisodes = tempEpisodes.filter(ep => ep.date && new Date(ep.date).getFullYear().toString() === selectedYear);
      if (selectedMonth) {
        tempEpisodes = tempEpisodes.filter(ep => ep.date && (new Date(ep.date).getMonth() + 1).toString() === selectedMonth);
      }
    }
    
    return tempEpisodes;
  }, [episodes, selectedYear, selectedMonth]);

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

      {/* Показываем состояние загрузки или пустое состояние */}
      {(loading || filteredEpisodes.length === 0) ? (
        <EmptyState currentLanguage={currentLanguage} isLoading={loading} />
      ) : (
        <EpisodesList 
          episodes={filteredEpisodes} 
          currentLanguage={currentLanguage} 
          episodeQuestionsCount={episodeQuestionsCount}
          allQuestions={allQuestions}
        />
      )}
    </div>
  );
};

export default InstantEpisodesPage;
