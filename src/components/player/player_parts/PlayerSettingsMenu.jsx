import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Settings, ScrollText, Download, Gauge, FileText, Volume2, Mic, HelpCircle } from 'lucide-react';
import { getLocaleString } from '@/lib/locales';

const PlayerSettingsMenu = ({
  currentLanguage,
  showTranscript,
  onToggleShowTranscript,
  onDownloadAudio,
  onDownloadText,
  isCompact = false,
  playbackRateOptions,
  currentPlaybackRateValue,
  onSetPlaybackRate,
  isOfflineMode = false,
  availableAudioVariants = [],
  selectedAudioLang,
  onAudioTrackChange,
  hasTranscript = false,
  hasQuestions = false,
  onRecognizeText,
  onRecognizeQuestions,
  isRecognizingText = false,
  isRecognizingQuestions = false
}) => {
  // Normalize and dedupe audio variants (accept strings or objects), sort ru, es, mixed, then others
  const normalizeLang = (v) => {
    const raw = (typeof v === 'string' ? v : v?.lang) || '';
    const l = String(raw).toLowerCase();
    // Map common synonyms to canonical codes
    if (['spanish', 'es-es', 'spa'].includes(l)) return 'es';
    if (['russian', 'ru-ru', 'rus'].includes(l)) return 'ru';
    if (['mix', 'mx'].includes(l)) return 'mixed';
    return l;
  };
  const variantMap = new Map();
  (availableAudioVariants || []).forEach(v => {
    const l = normalizeLang(v);
    if (!l) return;
    if (!variantMap.has(l)) variantMap.set(l, { lang: l });
  });
  const order = { ru: 0, es: 1, mixed: 2 };
  const normalizedVariants = Array.from(variantMap.values()).sort((a, b) => {
    const ao = order[a.lang] ?? 100;
    const bo = order[b.lang] ?? 100;
    return ao - bo || a.lang.localeCompare(b.lang);
  });

  const hasMultipleVariants = normalizedVariants.length > 1;
  const hasMixed = normalizedVariants.some(v => v.lang === 'mixed');
  const hasSpecificLanguages = normalizedVariants.some(v => v.lang === 'ru' || v.lang === 'es');
  const showAudioTracks = hasMultipleVariants || (hasMixed && hasSpecificLanguages);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size={isCompact ? "icon_sm" : "icon"} 
          className={`text-white/80 hover:text-white hover:bg-white/15 ${isCompact ? 'h-8 w-8' : 'h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11'}`}
          aria-label={getLocaleString('settings', currentLanguage)}
        >
          <Settings className={isCompact ? "h-4 w-4" : "h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5"} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60 bg-slate-800 border-slate-700 text-slate-100 shadow-xl" side="top" align="start">
        <DropdownMenuLabel className="text-purple-300">{getLocaleString('settings', currentLanguage)}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700" />
        
        <DropdownMenuCheckboxItem
          checked={showTranscript}
          onCheckedChange={onToggleShowTranscript}
          className="focus:bg-slate-700 data-[state=checked]:bg-purple-600/30"
        >
          <ScrollText className="mr-2 h-4 w-4 text-purple-300" />
          <span>{getLocaleString('showTranscript', currentLanguage)}</span>
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuSeparator className="bg-slate-700" />

        {showAudioTracks && (
          <>
            <DropdownMenuLabel className="text-purple-300 flex items-center">
                <Volume2 className="mr-2 h-4 w-4" />
                {getLocaleString('audioTrack', currentLanguage) || 'Audio Track'}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={(selectedAudioLang || '').toLowerCase()} onValueChange={(val) => onAudioTrackChange(String(val).toLowerCase())}>
                {normalizedVariants.map(({ lang }) => {
                    if (!lang) return null;
                    let trackName;
                    if (lang === 'ru') {
                        trackName = getLocaleString('audioTrackRussian', currentLanguage) || 'Русский';
                    } else if (lang === 'es') {
                        trackName = getLocaleString('audioTrackSpanish', currentLanguage) || 'Español';
                    } else if (lang === 'mixed') {
                        trackName = getLocaleString('audioTrackMixed', currentLanguage) || 'Mixed';
                    } else {
                        trackName = lang.toUpperCase();
                    }
                    return (
                        <DropdownMenuRadioItem 
                            key={lang} 
                            value={lang}
                            className="focus:bg-slate-700 data-[state=checked]:bg-purple-600/30"
                        >
                            {trackName}
                        </DropdownMenuRadioItem>
                    );
                })}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator className="bg-slate-700" />
          </>
        )}

        <DropdownMenuLabel className="text-purple-300 flex items-center">
            <Gauge className="mr-2 h-4 w-4" />
            {getLocaleString('playbackSpeed', currentLanguage)}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={String(currentPlaybackRateValue)} onValueChange={(value) => onSetPlaybackRate(parseFloat(value))}>
            {playbackRateOptions.map(option => (
                <DropdownMenuRadioItem 
                    key={option.value} 
                    value={String(option.value)}
                    className="focus:bg-slate-700 data-[state=checked]:bg-purple-600/30"
                >
                    {option.label}
                </DropdownMenuRadioItem>
            ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator className="bg-slate-700" />

        {!hasTranscript && (
          <DropdownMenuItem onClick={onRecognizeText} disabled={isRecognizingText} className="focus:bg-slate-700">
            <Mic className="mr-2 h-4 w-4 text-green-300" />
            <span>{isRecognizingText ? getLocaleString('transcribing', currentLanguage) || 'Распознавание текста...' : getLocaleString('recognizeText', currentLanguage) || 'Распознать текст'}</span>
          </DropdownMenuItem>
        )}

        {!hasQuestions && (
          <DropdownMenuItem onClick={onRecognizeQuestions} disabled={isRecognizingQuestions} className="focus:bg-slate-700">
            <HelpCircle className="mr-2 h-4 w-4 text-blue-300" />
            <span>{isRecognizingQuestions ? getLocaleString('recognizing', currentLanguage) || 'Распознавание вопросов...' : getLocaleString('recognizeQuestions', currentLanguage) || 'Распознать вопросы'}</span>
          </DropdownMenuItem>
        )}

        {(hasTranscript || hasQuestions) && (
          <DropdownMenuSeparator className="bg-slate-700" />
        )}

        <DropdownMenuItem onClick={onDownloadText} className="focus:bg-slate-700">
          <FileText className="mr-2 h-4 w-4 text-purple-300" />
          <span>{getLocaleString('downloadText', currentLanguage)}</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onDownloadAudio} className="focus:bg-slate-700 relative">
          <Download className="mr-2 h-4 w-4 text-purple-300" />
          <span>{getLocaleString('downloadAudio', currentLanguage)}</span>
          {isOfflineMode && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-orange-500 rounded-full border border-white/20"></div>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PlayerSettingsMenu;
