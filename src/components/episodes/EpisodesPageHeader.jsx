import React from 'react';
import { getLocaleString } from '@/lib/locales';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const EpisodesPageHeader = ({ currentLanguage, onLanguageChange }) => {
  return (
    <div className="relative flex items-center justify-between mb-6">
      <div className="flex items-center">
        <img
          src="/img/logo-5-120x120.png"
          alt="Dos Mundos Logo"
          className="w-10 h-10 sm:w-12 sm:h-12 mr-3 rounded-full object-contain shadow-md"
        />
        <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
          {getLocaleString('episodes', currentLanguage)}
        </h1>
      </div>
      <div className="flex items-center">
        <LanguageSwitcher
          currentLanguage={currentLanguage}
          onLanguageChange={onLanguageChange}
        />
      </div>
    </div>
  );
}

export default EpisodesPageHeader;
