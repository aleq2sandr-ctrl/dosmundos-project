import React from 'react';
import { Link } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';

const Header = ({ podcastData, currentLanguage = 'ru' }) => {
  return (
    <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-md border-b border-white/5 gap-4 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        {podcastData?.image && (
          <img 
            src={podcastData.image} 
            alt={podcastData.title}
            className="w-10 h-10 rounded-lg object-cover shadow-lg ring-1 ring-white/10"
          />
        )}
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight shadow-black drop-shadow-sm">
            {podcastData?.title || 'Dos Mundos Radio'}
          </h1>
          {podcastData?.author && (
            <p className="text-xs font-medium text-slate-300 uppercase tracking-wider opacity-80">
              {podcastData.author}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <nav className="flex items-center gap-1 md:gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          <Link 
            to={`/${currentLanguage}/about`} 
            className="px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap active:scale-95"
          >
            О центре
          </Link>
          <Link 
            to={`/${currentLanguage}/festival`} 
            className="px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap active:scale-95"
          >
            Фестиваль
          </Link>
          <Link 
            to={`/${currentLanguage}/volunteers`} 
            className="px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap active:scale-95"
          >
            Волонтерам
          </Link>
          <Link 
            to={`/${currentLanguage}/episodes`} 
            className="px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap active:scale-95"
          >
            Радио
          </Link>
        </nav>

        <div className="hidden md:block w-px h-6 bg-white/10"></div>
        
        <LanguageSwitcher currentLanguage={currentLanguage} />
      </div>
    </div>
  ); 
};

export default Header;