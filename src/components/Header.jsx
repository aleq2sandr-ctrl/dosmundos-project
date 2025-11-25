import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

const Header = ({ podcastData, currentLanguage = 'ru' }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const translations = {
    ru: { about: 'О центре', festival: 'Фестиваль', volunteers: 'Волонтерам', radio: 'Радио', live: 'Live' },
    en: { about: 'About', festival: 'Festival', volunteers: 'Volunteers', radio: 'Radio', live: 'Live' },
    es: { about: 'Sobre nosotros', festival: 'Festival', volunteers: 'Voluntarios', radio: 'Radio', live: 'En vivo' },
    de: { about: 'Über uns', festival: 'Festival', volunteers: 'Freiwillige', radio: 'Radio', live: 'Live' },
    fr: { about: 'À propos', festival: 'Festival', volunteers: 'Bénévoles', radio: 'Radio', live: 'En direct' },
    pl: { about: 'O nas', festival: 'Festiwal', volunteers: 'Wolontariat', radio: 'Radio', live: 'Na żywo' },
  };

  const t = translations[currentLanguage] || translations.en;

  const navLinks = [
    { to: `/${currentLanguage}/live`, label: t.live },
    { to: `/${currentLanguage}/about`, label: t.about },
    { to: `/${currentLanguage}/festival`, label: t.festival },
    { to: `/${currentLanguage}/volunteers`, label: t.volunteers },
    { to: `/${currentLanguage}/episodes`, label: t.radio },
  ];

  return (
    <header className="relative z-50 flex flex-col bg-black/20 backdrop-blur-md border-b border-white/5 transition-all duration-300">
      <div className="flex items-center justify-between px-4 py-3 gap-4">
        <div className="flex items-center gap-3 shrink-0">
          {podcastData?.image && (
            <img 
              src={podcastData.image} 
              alt={podcastData.title}
              className="w-10 h-10 rounded-lg object-cover shadow-lg ring-1 ring-white/10"
            />
          )}
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight shadow-black drop-shadow-sm">
              {podcastData?.title || 'Dos Mundos'}
            </h1>
            {podcastData?.author && (
              <p className="text-xs font-medium text-slate-300 uppercase tracking-wider opacity-80">
                {podcastData.author}
              </p>
            )}
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex flex-1 justify-center">
          <nav className="flex items-center gap-2">
            {navLinks.map((link) => (
              <Link 
                key={link.to}
                to={link.to} 
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap active:scale-95"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Desktop Language Switcher */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          <LanguageSwitcher currentLanguage={currentLanguage} />
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-white/5 bg-black/40 backdrop-blur-xl">
          <nav className="flex flex-col p-4 gap-2">
            {navLinks.map((link) => (
              <Link 
                key={link.to}
                to={link.to} 
                className="px-4 py-3 rounded-lg text-base font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 pt-4 border-t border-white/10 flex justify-between items-center px-2">
              <span className="text-sm text-slate-400">Язык / Language</span>
              <LanguageSwitcher currentLanguage={currentLanguage} />
            </div>
          </nav>
        </div>
      )}
    </header>
  ); 
};

export default Header;