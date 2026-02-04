import React from 'react';
import { ArrowLeft, ListMusic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getLocaleString } from '@/lib/locales';
import { Link, useParams } from 'react-router-dom';

const PlayerHeader = ({ episodeTitle, episodeDate, onNavigateBack, onNavigateHistory, currentLanguage, isReadingMode }) => {
  const logoUrl = "/img/logo-5-120x120.png";
  const { lang } = useParams();
  const langPrefix = lang || currentLanguage || 'ru';

  return (
    <div className="relative flex items-center justify-center mb-3 sm:mb-4">
      {!isReadingMode && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {onNavigateHistory && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onNavigateHistory} 
              className="text-slate-300 hover:text-white hover:bg-white/10 shrink-0"
              aria-label={getLocaleString('back', currentLanguage)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {onNavigateBack && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onNavigateBack} 
              className="text-slate-300 hover:text-white hover:bg-white/10 shrink-0"
              aria-label={getLocaleString('backToEpisodesShort', currentLanguage)}
            >
              <ListMusic className="h-5 w-5" />
            </Button>
          )}
          {!onNavigateBack && !onNavigateHistory && (
            <Link to={`/${langPrefix}/episodes`} className="p-1 rounded-md hover:bg-white/10 transition-colors shrink-0" aria-label={getLocaleString('backToEpisodes', currentLanguage)}>
              <img src={logoUrl} alt="Dos Mundos Logo" className="h-8 w-8 rounded-sm" />
            </Link>
          )}
        </div>
      )}
      <div className="flex-grow text-center px-16">
        <h1 
          className={`font-bold truncate ${isReadingMode ? 'text-3xl text-slate-900' : 'text-xl sm:text-2xl text-white'}`} 
          title={episodeTitle}
        >
          {episodeTitle}
        </h1>
      </div>
    </div>
  );
};

export default PlayerHeader;