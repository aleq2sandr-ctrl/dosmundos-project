import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Database, Star, Languages, HelpCircle } from 'lucide-react';
import { getLocaleString } from '@/lib/locales';

/**
 * Умная кнопка управления вопросами
 * Показывает доступные опции на основе данных и состояния
 */
const SmartQuestionButton = ({
  episode,
  episodes, // Все эпизоды для проверки переводов
  onLoadFromDB,
  onGenerateFromText,
  onTranslateFromLanguage,
  loadingFromDB,
  generatingFromText,
  translatingFrom,
  currentLanguage
}) => {
  const getQuestionOptions = () => {
    const options = [];

    // 0. Если вопросы уже есть - показываем опцию редактирования и управления
    if (episode.questionsCount > 0) {
      options.push({
        type: 'manage',
        text: `📝 Управление (${episode.questionsCount})`,
        available: true,
        loading: false,
        icon: <HelpCircle className="h-3 w-3 mr-1" />,
        action: 'manage'
      });
    }

    // 1. Извлечение из базы данных timeOld (ТОЛЬКО если есть данные)
    if (canLoadFromDB(episode)) {
      options.push({
        type: 'from_db',
        text: getLocaleString('fromDB', currentLanguage),
        available: true,
        loading: loadingFromDB,
        icon: <Database className="h-3 w-3 mr-1" />,
        action: 'loadFromDB'
      });
    }

    // 2. Распознавание из текста (если есть транскрипция)
    if (canGenerateFromText(episode)) {
      options.push({
        type: 'from_text',
        text: getLocaleString('recognize', currentLanguage),
        available: true,
        loading: generatingFromText,
        icon: <Star className="h-3 w-3 mr-1" />,
        action: 'generateFromText'
      });
    }

    // 3. Перевод с других языков (если есть готовые вопросы)
    const translationOptions = getAvailableTranslations(episode, episodes);
    options.push(...translationOptions);

    return options;
  };

  const canLoadFromDB = (episode) => {
    // Здесь будет логика проверки данных в таблице timeOld
    // Пока заглушка - в будущем подключим к базе данных
    return episode.questionsCount === 0 && episode.lang !== 'en';
  };

  const canGenerateFromText = (episode) => {
    return episode.transcript?.status === 'completed' && episode.questionsCount === 0;
  };

  const getAvailableTranslations = (episode, allEpisodes) => {
    if (episode.lang === 'en') return []; // Английский не переводится

    const options = [];
    const sameSlugEpisodes = allEpisodes.filter(ep =>
      ep.slug === episode.slug && ep.questionsCount > 0 && ep.lang !== episode.lang
    );

    sameSlugEpisodes.forEach(sourceEpisode => {
      // Приоритет для русского языка - показываем его первым
      const isRussian = sourceEpisode.lang === 'ru';
      const priority = isRussian ? 0 : 1;
      
      options.push({
        type: 'translate',
        text: `${getLocaleString('translateQuestionsFrom', currentLanguage)} ${sourceEpisode.lang.toUpperCase()}`,
        available: true,
        loading: translatingFrom[sourceEpisode.lang],
        icon: <Languages className="h-3 w-3 mr-1" />,
        action: 'translate',
        sourceLang: sourceEpisode.lang,
        priority: priority,
        isRussian: isRussian
      });
    });

    // Сортируем по приоритету (русский первым)
    return options.sort((a, b) => a.priority - b.priority);
  };

  const questionOptions = getQuestionOptions();

  if (questionOptions.length === 0) {
    return (
      <div className="text-xs text-slate-400 text-center">
        {getLocaleString('questionsNotFound', currentLanguage)}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {questionOptions.map((option, index) => (
        <Button
          key={index}
          size="sm"
          variant="outline"
          onClick={() => {
            if (option.action === 'manage') {
              // Перенаправляем на плеер для управления вопросами
              window.location.href = `/${episode.lang}/episode/${episode.slug}?edit=questions`;
            } else if (option.action === 'loadFromDB') {
              onLoadFromDB(episode);
            } else if (option.action === 'generateFromText') {
              onGenerateFromText(episode);
            } else if (option.action === 'translate') {
              onTranslateFromLanguage(episode, option.sourceLang);
            }
          }}
          disabled={option.loading || !option.available}
          className={`h-8 px-2 text-xs ${
            option.type === 'manage'
              ? 'bg-amber-600/20 border-amber-500 text-amber-300 hover:bg-amber-600/40 hover:text-amber-200'
              : option.type === 'from_db'
              ? 'bg-blue-600/20 border-blue-500 text-blue-300 hover:bg-blue-600/40 hover:text-blue-200'
              : option.type === 'from_text'
              ? 'bg-purple-600/20 border-purple-500 text-purple-300 hover:bg-purple-600/40 hover:text-purple-200'
              : option.isRussian
              ? 'bg-blue-600/20 border-blue-500 text-blue-300 hover:bg-blue-600/40 hover:text-blue-200'
              : 'bg-green-600/20 border-green-500 text-green-300 hover:bg-green-600/40 hover:text-green-200'
          }`}
          title={option.text}
        >
          {option.loading ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            option.icon
          )}
          {option.text}
        </Button>
      ))}
    </div>
  );
};

export default SmartQuestionButton;
