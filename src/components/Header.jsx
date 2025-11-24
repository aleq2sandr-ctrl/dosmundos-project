import React from 'react';
import { Link } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';

const Header = ({ podcastData, currentLanguage = 'ru' }) => {
  const navLinks = [
    { path: 'about', label: 'О центре' },
    { path: 'festival', label: 'Фестиваль' },
    { path: 'volunteers', label: 'Волонтерам' },
    { path: 'episodes', label: 'Радио' },
  ];

  return (
    <div className="sticky top-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/5">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between relative">
        {/* Left: Logo */}
        <div className="flex items-center gap-3 shrink-0">
          {podcastData?.image && (
            <img 
              src={podcastData.image} 
              alt={podcastData.title}
              className="w-10 h-10 rounded-lg object-cover shadow-lg ring-1 ring-white/10"
            />
          )}
          <div className="hidden sm:block">
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

        {/* Center: Navigation (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5 backdrop-blur-sm absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {navLinks.map(link => (
            <Link 
              key={link.path}
              to={`/${currentLanguage}/${link.path}`} 
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap active:scale-95"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: Language Switcher */}
        <div className="flex items-center gap-4 shrink-0 ml-auto md:ml-0">
          <LanguageSwitcher currentLanguage={currentLanguage} />
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-white/5 py-2 overflow-x-auto no-scrollbar">
         <nav className="flex items-center justify-center gap-2 px-4 min-w-max">
            {navLinks.map(link => (
              <Link 
                key={link.path}
                to={`/${currentLanguage}/${link.path}`} 
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap active:scale-95"
              >
                {link.label}
              </Link>
            ))}
         </nav>
      </div>
    </div>
  ); 
};

export default Header;