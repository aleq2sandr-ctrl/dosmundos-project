import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePlayer } from '@/contexts/PlayerContext';
import { Play, Pause, X, Maximize2 } from 'lucide-react';

const GlobalPlayer = ({ currentLanguage }) => {
  const { 
    currentEpisode, 
    isPlaying, 
    togglePlay, 
    closeGlobalPlayer, 
    isGlobalPlayerVisible,
    currentTime,
    duration
  } = usePlayer();
  
  const navigate = useNavigate();
  const location = useLocation();

  if (!isGlobalPlayerVisible || !currentEpisode) return null;

  // Don't show global player if we are already on the player page for this episode
  const isPlayerPage = location.pathname.includes(`/episode/${currentEpisode.slug}`);
  if (isPlayerPage) return null;

  const handleNavigateToEpisode = () => {
    navigate(`/${currentLanguage}/episode/${currentEpisode.slug}`);
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full bg-slate-900/95 backdrop-blur-md border-t border-white/10 shadow-inner transition-all duration-300 animate-in slide-in-from-top-2">
      {/* Progress bar */}
      <div className="relative w-full h-1 bg-white/10">
        <div 
          className="absolute top-0 left-0 h-full bg-purple-500 transition-all duration-300 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="px-4 py-2 flex items-center justify-between gap-4">
        <div 
          className="flex items-center gap-3 flex-1 cursor-pointer min-w-0 group"
          onClick={handleNavigateToEpisode}
        >
          {currentEpisode.image && (
            <img 
              src={currentEpisode.image} 
              alt={currentEpisode.title} 
              className="w-10 h-10 rounded object-cover ring-1 ring-white/10 group-hover:ring-purple-500/50 transition-all"
            />
          )}
          <div className="min-w-0 overflow-hidden">
            <h3 className="text-sm font-medium text-white truncate group-hover:text-purple-400 transition-colors">
              {currentEpisode.title}
            </h3>
            <p className="text-xs text-slate-400 truncate">
              {currentEpisode.author || 'Dos Mundos'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
          </button>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              closeGlobalPlayer();
            }}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalPlayer;
