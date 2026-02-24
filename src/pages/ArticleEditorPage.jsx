import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import { DOMSerializer } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import QuestionBlock from '@/extensions/QuestionBlock';
import { getLocaleString } from '@/lib/locales';
import { useEditorAuth } from '@/contexts/EditorAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/utils';
import {
  getArticle,
  saveArticle,
  saveArticleTranslation,
  createDraftFromQuestion,
  deleteArticle,
  getEpisodeAudioUrl,
  getCategories,
  getQuestionTranscript,
  ensureArticleTranslationLink,
  getArticleTranslationStatuses,
  sanitizeSlug,
  updateArticleSlug
} from '@/services/articleService';
import {
  ArrowLeft, Save, Send, Globe, Eye,
  Bold, Italic, Underline as UnderlineIcon, Heading2, Heading3,
  Link as LinkIcon, Undo2, Redo2, Quote,
  Play, Pause, RotateCcw, RotateCw,
  FileEdit, FileCheck, FileSearch, Radio, Calendar, User,
  X, Loader2, Code, Trash2, Languages,
  Sparkles, Wand2, MessageSquare, AlignLeft, HelpCircle, Highlighter
} from 'lucide-react';
import {
  aiCleanText, aiSplitParagraphs, aiCustomPrompt, aiGenerateSummary, aiTranslateArticle
} from '@/lib/openAIService';

// ─── Category color map ──────────────────────────────────────────────────────
const categoryColorsBySlug = {
  'teacher-plants-diet':        { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', activeBg: 'bg-emerald-500', activeText: 'text-white' },
  'healing-energy-practices':   { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', activeBg: 'bg-violet-500', activeText: 'text-white' },
  'relationships-family':       { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20', activeBg: 'bg-pink-500', activeText: 'text-white' },
  'inner-development':          { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', activeBg: 'bg-indigo-500', activeText: 'text-white' },
  'health-nutrition':           { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', activeBg: 'bg-rose-500', activeText: 'text-white' },
  'energy-protection-cleansing': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', activeBg: 'bg-amber-500', activeText: 'text-white' },
  'meditations':                { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20', activeBg: 'bg-sky-500', activeText: 'text-white' },
};

// ─── Status config ───────────────────────────────────────────────────────────
const statusConfig = {
  draft:     { icon: FileEdit,   color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', label: 'status_draft' },
  pending:   { icon: FileSearch, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30', label: 'status_pending' },
  published: { icon: FileCheck,  color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', label: 'status_published' },
};

// ─── Format ms to mm:ss ──────────────────────────────────────────────────────
const formatMs = (ms) => formatTime(ms / 1000);
const PUBLISHER_EMAIL = 'perudosmundosperu@gmail.com';
const ARTICLE_TRANSLATION_OPTIONS = [
  { code: 'ru', label: 'Русский' },
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'pl', label: 'Polski' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// AI ACTIONS DROPDOWN
// ═══════════════════════════════════════════════════════════════════════════════
const AIDropdown = ({ onAction, loading, lang }) => {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleAction = (action, prompt) => {
    setOpen(false);
    setShowCustom(false);
    onAction(action, prompt);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        title="AI"
        className={`p-2 rounded-lg transition-all duration-150 ${
          loading
            ? 'text-purple-500 animate-pulse'
            : open
              ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300'
              : 'text-purple-500 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-700 dark:hover:text-purple-300'
        }`}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
      </button>

      {open && !loading && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-[120] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-1">
            <button
              onClick={() => handleAction('clean')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors text-left"
            >
              <Wand2 className="w-4 h-4 text-purple-500 shrink-0" />
              <div>
                <p className="font-medium">{getLocaleString('ai_clean_text', lang) || 'Clean filler words'}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{getLocaleString('ai_clean_text_desc', lang) || 'Remove um, uh, like, filler words'}</p>
              </div>
            </button>
            <button
              onClick={() => handleAction('paragraphs')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors text-left"
            >
              <AlignLeft className="w-4 h-4 text-purple-500 shrink-0" />
              <div>
                <p className="font-medium">{getLocaleString('ai_split_paragraphs', lang) || 'Split into paragraphs'}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{getLocaleString('ai_split_paragraphs_desc', lang) || 'Organize text into logical paragraphs'}</p>
              </div>
            </button>
            <div className="h-px bg-slate-100 dark:bg-slate-700 mx-2 my-1" />
            {!showCustom ? (
              <button
                onClick={() => setShowCustom(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors text-left"
              >
                <MessageSquare className="w-4 h-4 text-purple-500 shrink-0" />
                <div>
                  <p className="font-medium">{getLocaleString('ai_custom_prompt', lang) || 'Custom prompt'}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{getLocaleString('ai_custom_prompt_desc', lang) || 'Enter your own instruction'}</p>
                </div>
              </button>
            ) : (
              <div className="px-3 py-2">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={getLocaleString('ai_custom_placeholder', lang) || 'Describe what to do...'}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && customPrompt.trim()) {
                      e.preventDefault();
                      handleAction('custom', customPrompt.trim());
                      setCustomPrompt('');
                    }
                  }}
                />
                <button
                  onClick={() => { if (customPrompt.trim()) { handleAction('custom', customPrompt.trim()); setCustomPrompt(''); } }}
                  disabled={!customPrompt.trim()}
                  className="mt-1.5 w-full py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-sm font-medium transition-colors"
                >
                  {getLocaleString('send', lang) || 'Send'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HIGHLIGHT COLOR PICKER
// ═══════════════════════════════════════════════════════════════════════════════
const HighlightColorPicker = ({ editor }) => {
  const [showColors, setShowColors] = useState(false);
  
  const colors = [
    { name: 'Yellow', value: '#fef08a', class: 'bg-yellow-200' },
    { name: 'Green', value: '#bbf7d0', class: 'bg-green-200' },
    { name: 'Blue', value: '#bfdbfe', class: 'bg-blue-200' },
    { name: 'Pink', value: '#fbcfe8', class: 'bg-pink-200' },
    { name: 'Purple', value: '#e9d5ff', class: 'bg-purple-200' },
  ];

  const currentColor = colors.find(c => editor.isActive('highlight', { color: c.value }));
  const isActive = editor.isActive('highlight');

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowColors(true)}
      onMouseLeave={() => setShowColors(false)}
    >
      <button
        onMouseDown={e => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title="Highlight"
        className={`p-2 rounded-lg transition-all duration-150 ${
          isActive
            ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <Highlighter className="w-4 h-4" />
      </button>
      
      {showColors && (
        <div className="absolute top-full left-0 mt-1 flex gap-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-1.5 z-50">
          {colors.map((color) => (
            <button
              key={color.value}
              onMouseDown={e => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleHighlight({ color: color.value }).run()}
              title={color.name}
              className={`w-6 h-6 rounded ${color.class} border-2 ${
                editor.isActive('highlight', { color: color.value })
                  ? 'border-slate-900 dark:border-slate-100 scale-110'
                  : 'border-transparent hover:border-slate-400'
              } transition-all`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TOOLBAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const EditorToolbar = ({ editor, onAiAction, aiLoading, lang }) => {
  // Early return AFTER all hooks
  if (!editor) return null;

  const tools = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), title: 'Bold' },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), title: 'Italic' },
    { icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), title: 'Underline' },
    { type: 'divider' },
    { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), title: 'H2' },
    { icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }), title: 'H3' },
    { type: 'divider' },
    { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote'), title: 'Quote' },
    { icon: HelpCircle, action: () => editor.chain().focus().toggleQuestionBlock().run(), active: editor.isActive('questionBlock'), title: 'Question' },
    { type: 'divider' },
    { icon: Undo2, action: () => editor.chain().focus().undo().run(), active: false, disabled: !editor.can().undo(), title: 'Undo' },
    { icon: Redo2, action: () => editor.chain().focus().redo().run(), active: false, disabled: !editor.can().redo(), title: 'Redo' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-2 py-1 border-t border-slate-200/60 dark:border-slate-700/40">
      <div className="flex items-center gap-0.5 flex-wrap px-2">
        {tools.map((tool, i) => {
          if (tool.type === 'divider') return <div key={i} className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />;
          const Icon = tool.icon;
          return (
            <button
              key={i}
              onMouseDown={e => e.preventDefault()}
              onClick={tool.action}
              disabled={tool.disabled}
              title={tool.title}
              className={`p-2 rounded-lg transition-all duration-150 ${
                tool.active
                  ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300'
                  : tool.disabled
                    ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
        <HighlightColorPicker editor={editor} />
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
        <AIDropdown onAction={onAiAction} loading={aiLoading} lang={lang} />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MINI AUDIO PLAYER (compact with time editing)
// ═══════════════════════════════════════════════════════════════════════════════

// Editable time input (mm:ss format)
const TimeInput = ({ value, onChange, label }) => {
  const timeStr = formatTime(value || 0);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(timeStr);

  useEffect(() => { if (!editing) setText(formatTime(value || 0)); }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const parts = text.split(':').map(Number);
    let sec = 0;
    if (parts.length === 2) sec = (parts[0] || 0) * 60 + (parts[1] || 0);
    else if (parts.length === 3) sec = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    else sec = Number(text) || 0;
    if (sec >= 0) onChange(sec);
  };

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium leading-none">{label}</span>
      {editing ? (
        <input
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={e => e.key === 'Enter' && commit()}
          className="w-14 text-center text-xs font-mono bg-white dark:bg-slate-700 border border-purple-400 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-purple-400 text-slate-800 dark:text-slate-200"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-xs font-mono text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 bg-purple-50 dark:bg-purple-500/10 px-1.5 py-0.5 rounded hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-all cursor-text"
          title="Click to edit"
        >
          {timeStr}
        </button>
      )}
    </div>
  );
};

const MiniPlayer = ({ audioUrl, episodeSlug, questionTime, questionEndTime, lang, audioRef: externalAudioRef }) => {
  const internalAudioRef = useRef(null);
  const audioRef = externalAudioRef || internalAudioRef;
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.5);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressRef = useRef(null);

  const startSec = questionTime || 0;
  const endSec = questionEndTime || duration || 0;
  const segmentDuration = endSec - startSec;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
    const onTime = () => {
      setCurrentTime(audio.currentTime - startSec);
      if (questionEndTime && audio.currentTime >= questionEndTime) {
        audio.pause();
        setIsPlaying(false);
      }
    };
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => setIsPlaying(false);
    const onPause = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
    };
  }, [startSec, questionEndTime, playbackRate]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      // Reset speed to 1x when pressing play
      if (playbackRate !== 1) {
        setPlaybackRate(1);
        audio.playbackRate = 1;
      }
      audio.play();
    }
  };

  const skip = (sec) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(startSec, Math.min(audio.currentTime + sec, endSec || audio.duration));
  };

  const handleProgressClick = (e) => {
    if (!progressRef.current || !audioRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = startSec + ratio * segmentDuration;
  };

  const progress = segmentDuration > 0 ? Math.max(0, Math.min(100, (currentTime / segmentDuration) * 100)) : 0;

  if (!audioUrl) return null;

  return (
    <div className="bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200/60 dark:border-slate-700/30">
      <div className="mx-auto max-w-4xl flex items-center gap-1.5 px-3 py-1">
        <audio ref={audioRef} src={audioUrl} preload="metadata" />

        {/* Controls */}
        <div className="flex items-center gap-0 shrink-0">
          <button onClick={() => skip(-10)} className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all" title="-10s">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={togglePlay} className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all active:scale-95 mx-0.5">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button onClick={() => skip(10)} className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all" title="+10s">
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Speed */}
        <div className="hidden sm:flex items-center gap-0.5 shrink-0 ml-1">
          {[1.5, 2, 3].map(rate => (
            <button
              key={rate}
              onClick={() => {
                // If already at this rate, toggle off (return to 1x)
                if (playbackRate === rate) {
                  setPlaybackRate(1);
                  if (audioRef.current) audioRef.current.playbackRate = 1;
                } else {
                  setPlaybackRate(rate);
                  if (audioRef.current) audioRef.current.playbackRate = rate;
                }
              }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                playbackRate === rate
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title={`x${rate}`}
            >
              x{rate}
            </button>
          ))}
        </div>

        {/* Progress */}
        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
          {formatTime(Math.max(0, currentTime))}
        </span>
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full cursor-pointer group relative min-w-0"
        >
          <div
            className="h-full bg-purple-500 rounded-full transition-all duration-100 relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow border-[1.5px] border-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <span className="text-[10px] font-mono text-slate-400 tabular-nums shrink-0">
          {formatTime(Math.max(0, segmentDuration))}
        </span>

        {/* Episode link */}
        {episodeSlug && (
          <Link
            to={`/${lang}/${episodeSlug}`}
            className="shrink-0 p-0.5 rounded text-slate-400 hover:text-purple-600 transition-all"
            title={episodeSlug}
          >
            <Radio className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// BOTTOM SETTINGS PANEL (below editor)
// ═══════════════════════════════════════════════════════════════════════════════
const BottomSettingsPanel = ({
  summary, setSummary,
  youtubeUrl, setYoutubeUrl,
  editorName, setEditorName,
  articleDate, setArticleDate,
  articleSlug, onSlugChange,
  selectedCategories, setSelectedCategories,
  allCategories,
  questionInfo, onTimeChange,
  onGenerateSummary, aiLoading,
  canManageTranslations,
  translationStatusByLang,
  translatingLang,
  onTranslateLanguage,
  lang,
  status,
  onSaveStatus,
  saving,
  canPublish,
  onDelete
}) => {
  return (
    <div className="mx-auto max-w-4xl px-2 mt-4">
      <div className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {getLocaleString('details', lang)}
          </span>
        </div>
      </div>

      <div className="mt-2 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 shadow-sm overflow-hidden">
        <div className="p-5 space-y-5">
            {/* Editor name & date row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  <User className="w-3 h-3" />
                  {getLocaleString('editor_name', lang) || 'Editor'}
                </label>
                <input
                  value={editorName}
                  onChange={(e) => setEditorName(e.target.value)}
                  placeholder={getLocaleString('editor_name', lang) || 'Editor name'}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  <Calendar className="w-3 h-3" />
                  {getLocaleString('date', lang) || 'Date'}
                </label>
                <input
                  type="date"
                  value={articleDate}
                  onChange={(e) => setArticleDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all"
                />
              </div>
            </div>

            {/* Article slug */}
            {articleSlug && (
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  <LinkIcon className="w-3 h-3" />
                  URL slug
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 font-mono">/{lang}/articles/</span>
                  <input
                    defaultValue={articleSlug}
                    key={articleSlug}
                    onBlur={(e) => {
                      const cleaned = sanitizeSlug(e.target.value);
                      if (cleaned && cleaned !== articleSlug) onSlugChange?.(cleaned);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.target.blur();
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Summary */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {getLocaleString('article_summary_placeholder', lang)}
                </label>
                <button
                  onClick={onGenerateSummary}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 border border-purple-200/50 dark:border-purple-500/20 transition-all disabled:opacity-50"
                  title={getLocaleString('ai_generate_summary', lang) || 'Generate summary with AI'}
                >
                  {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {getLocaleString('ai_generate_summary', lang) || 'AI Summary'}
                </button>
              </div>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={getLocaleString('article_summary_placeholder', lang)}
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all resize-none"
              />
            </div>

            {/* Categories */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                {getLocaleString('all_categories', lang)}
              </label>
              <div className="flex flex-wrap gap-2">
                {allCategories.map(cat => {
                  const isSelected = selectedCategories.includes(cat.id);
                  const colors = categoryColorsBySlug[cat.slug] || { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', activeBg: 'bg-slate-500', activeText: 'text-white' };
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategories(prev =>
                          isSelected ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                        );
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                        isSelected
                          ? `${colors.activeBg} ${colors.activeText} border-transparent shadow-md`
                          : `${colors.bg} ${colors.text} ${colors.border} hover:scale-105`
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* YouTube URL */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                YouTube URL
              </label>
              <input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all font-mono text-sm"
              />
            </div>

            {/* Question info with time editing */}
            {questionInfo && (
              <div className="px-4 py-3 bg-purple-50/80 dark:bg-purple-500/5 border border-purple-200/50 dark:border-purple-500/20 rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  <Radio className="w-4 h-4 text-purple-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-purple-900 dark:text-purple-200 truncate">{questionInfo.title}</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-mono">
                      {questionInfo.episodeSlug}
                    </p>
                  </div>
                  <Link
                    to={`/${lang}/${questionInfo.episodeSlug}`}
                    className="shrink-0 text-xs text-purple-600 hover:text-purple-800 dark:text-purple-300 dark:hover:text-purple-100 underline"
                  >
                    {getLocaleString('listen_answer_on_air', lang)}
                  </Link>
                </div>
                {/* Editable start/end time */}
                <div className="flex items-center gap-4 pt-1">
                  <TimeInput value={questionInfo.time} onChange={(v) => onTimeChange?.('start', v)} label="Start" />
                  <span className="text-slate-300 dark:text-slate-600">—</span>
                  <TimeInput value={questionInfo.endTime} onChange={(v) => onTimeChange?.('end', v)} label="End" />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
                    {getLocaleString('duration', lang) || 'Duration'}: {formatTime((questionInfo.endTime || 0) - (questionInfo.time || 0))}
                  </span>
                </div>
              </div>
            )}

            {canManageTranslations && (
              <div className="px-4 py-4 bg-emerald-50/70 dark:bg-emerald-500/5 border border-emerald-200/60 dark:border-emerald-500/20 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                    <Languages className="w-3 h-3" />
                    Переводы (DeepSeek)
                  </label>
                  <span className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                    Источник: {lang.toUpperCase()}
                  </span>
                </div>

                {!articleSlug || articleSlug === 'new' ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Сначала сохраните статью как черновик, затем можно переводить.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {ARTICLE_TRANSLATION_OPTIONS.map(option => {
                        const translated = !!translationStatusByLang?.[option.code];
                        return (
                          <span
                            key={option.code}
                            className={`text-[11px] px-2.5 py-1 rounded-full border ${
                              translated
                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300/70 dark:border-emerald-400/30'
                                : 'bg-slate-100 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'
                            }`}
                          >
                            {option.code.toUpperCase()} · {option.label}
                          </span>
                        );
                      })}
                    </div>

                    <div className="space-y-2 pt-1">
                      {ARTICLE_TRANSLATION_OPTIONS.filter(option => option.code !== lang).map(option => {
                        const translated = !!translationStatusByLang?.[option.code];
                        const loading = translatingLang === option.code;

                        return (
                          <div key={option.code} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white/70 dark:bg-slate-900/30 border border-slate-200/70 dark:border-slate-700/60">
                            <div>
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                {option.label} ({option.code.toUpperCase()})
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {translated ? 'Уже переведено' : 'Перевод отсутствует'}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {!translated ? (
                                <button
                                  onClick={() => onTranslateLanguage?.(option.code, false)}
                                  disabled={!!translatingLang}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white transition-colors"
                                >
                                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Перевести'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => onTranslateLanguage?.(option.code, true)}
                                  disabled={!!translatingLang}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white transition-colors"
                                >
                                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Перевести с заменой'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
        </div>

        {/* Status selection panel */}
        <div className="mt-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 shadow-sm overflow-hidden">
          <div className="p-5">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              {getLocaleString('article_status', lang) || 'Article Status'}
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Save as Draft */}
              <button
                onClick={() => onSaveStatus('draft')}
                disabled={saving}
                className="flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                style={{
                  backgroundColor: status === 'draft' ? '#fef08a' : '#fef3c7',
                  color: '#b45309',
                  border: '1px solid #fbcf33'
                }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileEdit className="w-4 h-4" />}
                <span>{getLocaleString('save_as_draft', lang) || 'Save as Draft'}</span>
              </button>

              {/* Submit for Review */}
              {status !== 'published' && status !== 'pending' && (
                <button
                  onClick={() => onSaveStatus('pending')}
                  disabled={saving}
                  className="flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{
                    backgroundColor: status === 'pending' ? '#fed7aa' : '#fedd5e',
                    color: '#92400e',
                    border: '1px solid #f59e0b'
                  }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{getLocaleString('submit_for_review', lang) || 'Submit for Review'}</span>
                </button>
              )}

              {/* Publish */}
              {canPublish && (
                <button
                  onClick={() => onSaveStatus('published')}
                  disabled={saving}
                  className="flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-white"
                  style={{
                    backgroundColor: status === 'published' ? '#059669' : '#10b981',
                    border: '1px solid #059669'
                  }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                  <span>{getLocaleString('publish', lang) || 'Publish'}</span>
                </button>
              )}

              {/* Delete */}
              {articleSlug && (
                <button
                  onClick={onDelete}
                  disabled={saving}
                  className="flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
                  style={{
                    border: '1px solid #fca5a5'
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{getLocaleString('delete', lang) || 'Delete'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EDITOR PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const ArticleEditorPage = () => {
  const { lang, articleId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { editor: editorAuth, isAuthenticated, openAuthModal } = useEditorAuth();

  // ─── State ────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [articleSlug, setArticleSlug] = useState(articleId !== 'new' ? articleId : null);
  const [status, setStatus] = useState('draft');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  // Question / audio data
  const [questionInfo, setQuestionInfo] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [translatingLang, setTranslatingLang] = useState(null);
  const [translationStatusByLang, setTranslationStatusByLang] = useState({});
  const [editorName, setEditorName] = useState('');
  const [articleDate, setArticleDate] = useState(() => new Date().toISOString().slice(0, 10));

  const isNew = articleId === 'new';
  const editorRef = useRef(null);
  const pendingContentRef = useRef(null);
  const articleAudioRef = useRef(null);
  const ensuredTranslationRef = useRef(new Set());
  const canPublish = (editorAuth?.email || '').toLowerCase() === PUBLISHER_EMAIL;

  // ─── TipTap editor ────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      ImageExtension.configure({ inline: false, allowBase64: true }),
      LinkExtension.configure({ openOnClick: false, autolink: true }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      QuestionBlock,
      Placeholder.configure({
        placeholder: getLocaleString('start_writing', lang),
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-xl max-w-none font-serif focus:outline-none min-h-[50vh] px-6 py-8 md:px-10 md:py-10 text-slate-800 dark:text-slate-200 prose-headings:font-serif prose-headings:text-slate-900 dark:prose-headings:text-slate-100 prose-p:leading-loose prose-p:indent-8 prose-p:mb-5 prose-p:mt-0 prose-a:text-purple-700 dark:prose-a:text-purple-400 prose-blockquote:border-l-purple-400 prose-blockquote:bg-purple-50/50 dark:prose-blockquote:bg-purple-500/5 prose-blockquote:rounded-r-xl prose-blockquote:py-2 prose-blockquote:px-6 prose-img:rounded-xl prose-img:shadow-lg',
      },
    },
    onUpdate: () => setHasUnsaved(true),
  });
  editorRef.current = editor;

  const getSelectedHtml = useCallback(() => {
    if (!editor) return null;
    const { from, to, empty } = editor.state.selection;
    if (empty || from === to) return null;

    const slice = editor.state.doc.slice(from, to);
    const serializer = DOMSerializer.fromSchema(editor.schema);
    const fragment = serializer.serializeFragment(slice.content);
    const container = document.createElement('div');
    container.appendChild(fragment);
    const html = container.innerHTML.trim();

    if (!html) return null;
    return { html, from, to };
  }, [editor]);

  // Apply pending content when editor becomes available
  useEffect(() => {
    if (editor && pendingContentRef.current != null) {
      console.log('[ArticleEditorPage] Applying pending content to editor');
      editor.commands.setContent(pendingContentRef.current);
      pendingContentRef.current = null;
    }
  }, [editor]);

  // ─── Auth check ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      openAuthModal();
    }
  }, [isAuthenticated, openAuthModal]);

  // ─── Load categories ──────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const result = await getCategories(lang);
      if (result.success) setAllCategories(result.data);
    };
    load();
  }, [lang]);

  // ─── Load article or prepare from question ────────────────────────
  // Helper: set editor content — applies immediately if editor is ready, 
  // otherwise stores in pendingContentRef for the useEffect above to apply
  const setEditorContent = useCallback((html) => {
    const ed = editorRef.current;
    if (ed && !ed.isDestroyed) {
      console.log('[ArticleEditorPage] Setting content directly, length:', html.length);
      ed.commands.setContent(html);
    } else {
      console.log('[ArticleEditorPage] Editor not ready, storing pending content, length:', html.length);
      pendingContentRef.current = html;
    }
  }, []);

  // Helper: get question params from URL or sessionStorage
  const getQuestionParams = useCallback(() => {
    // Try URL search params first
    let episode = searchParams.get('episode');
    let questionTitle = searchParams.get('title') || '';
    let time = searchParams.get('time');
    let endTime = searchParams.get('endTime');
    let questionId = searchParams.get('questionId');

    console.log('[ArticleEditorPage] URL params:', { episode, questionTitle, time, endTime, questionId });

    // Fallback: try sessionStorage
    if (!episode) {
      try {
        const stored = sessionStorage.getItem('newArticleFromQuestion');
        if (stored) {
          const data = JSON.parse(stored);
          // Only use if fresh (less than 5 minutes old)
          if (data.ts && Date.now() - data.ts < 5 * 60 * 1000) {
            episode = data.episode || null;
            questionTitle = data.title || '';
            time = data.time != null ? String(data.time) : null;
            endTime = data.endTime != null ? String(data.endTime) : null;
            questionId = data.questionId || null;
            console.log('[ArticleEditorPage] Using sessionStorage params:', { episode, questionTitle, time, endTime, questionId });
          } else {
            console.log('[ArticleEditorPage] sessionStorage data expired');
          }
        }
      } catch (e) {
        console.warn('[ArticleEditorPage] Failed to read sessionStorage:', e);
      }
    }

    // Don't remove sessionStorage here — it will be cleaned up after successful load
    // (needed for StrictMode double-mount resilience)

    return { episode, questionTitle, time, endTime, questionId };
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (isNew) {
          const { episode, questionTitle, time, endTime, questionId } = getQuestionParams();

          setTitle(questionTitle);

          if (episode) {
            const qTime = time != null && time !== '' ? Number(time) : null;
            const qEnd = endTime != null && endTime !== '' ? Number(endTime) : null;

            setQuestionInfo({
              questionId, episodeSlug: episode,
              title: questionTitle, time: qTime, endTime: qEnd
            });

            // Load audio
            const url = await getEpisodeAudioUrl(episode, lang);
            if (url && !cancelled) setAudioUrl(url);

            // Load transcript for this question's time range
            if (qTime != null) {
              console.log('[ArticleEditorPage] Loading transcript:', { episode, lang, qTime, qEnd });
              const result = await getQuestionTranscript(episode, lang, qTime, qEnd);
              console.log('[ArticleEditorPage] Transcript result:', { success: result.success, count: result.data?.length });
              if (result.success && result.data.length > 0 && !cancelled) {
                const questionStartMs = (qTime || 0) * 1000;
                const html = result.data.map(u => {
                  const relativeMs = Math.max(0, u.start - questionStartMs);
                  const timeMark = formatMs(relativeMs);
                  return `<p><strong>[${timeMark}]</strong> ${u.text || ''}</p>`;
                }).join('\n');
                setEditorContent(html);
              }
            }

          } else {
            console.warn('[ArticleEditorPage] No episode data found in URL or sessionStorage');
          }
          // Clean up sessionStorage after successful load
          if (!cancelled) {
            try { sessionStorage.removeItem('newArticleFromQuestion'); } catch (e) {}
          }
        } else {
          // Editing existing
          const result = await getArticle(articleId, lang);
          if (!result.success || !result.data) {
            if (!cancelled) {
              toast({ title: getLocaleString('article_not_found', lang), variant: 'destructive' });
              navigate(`/${lang}/articles`);
            }
            return;
          }
          const d = result.data;
          if (!cancelled) {
            setArticleSlug(d.slug);
            setStatus(d.status);
            setTitle(d.title);
            setSummary(d.summary);
            setYoutubeUrl(d.youtubeUrl || '');
            setImageUrl(d.imageUrl || '');
            setSelectedCategories(d.categories.map(c => c.id));
            setEditorContent(d.content || '');

            if (d.episodeSlug && d.questionTime != null) {
              setQuestionInfo({
                episodeSlug: d.episodeSlug,
                title: d.title,
                time: d.questionTime,
                endTime: d.questionEndTime
              });
              const url = await getEpisodeAudioUrl(d.episodeSlug, lang);
              if (url) setAudioUrl(url);
            }
          }
        }
      } catch (err) {
        console.error('[ArticleEditorPage] Load error:', err);
        if (!cancelled) toast({ title: 'Error loading article', variant: 'destructive' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [articleId, lang, isNew]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Autosave to localStorage ─────────────────────────────────────
  useEffect(() => {
    if (!editor || !hasUnsaved) return;
    const key = `article_draft_${articleSlug || 'new'}`;
    const timer = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify({
        title, summary, youtubeUrl, content: editor.getHTML(),
        selectedCategories, savedAt: Date.now()
      }));
    }, 30000);
    return () => clearTimeout(timer);
  }, [hasUnsaved, title, summary, youtubeUrl, editor, articleSlug, selectedCategories]);

  // ─── Unsaved changes warning ──────────────────────────────────────
  useEffect(() => {
    if (!hasUnsaved) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsaved]);

  const refreshTranslationStatuses = useCallback(async () => {
    if (!articleSlug || articleSlug === 'new') {
      setTranslationStatusByLang({});
      return;
    }

    const result = await getArticleTranslationStatuses(articleSlug);
    if (result.success) {
      setTranslationStatusByLang(result.data.statusByLang || {});
    }
  }, [articleSlug]);

  useEffect(() => {
    refreshTranslationStatuses();
  }, [refreshTranslationStatuses]);

  useEffect(() => {
    if (!editor || !articleSlug || articleSlug === 'new' || loading) return;

    const key = `${articleSlug}:${lang}`;
    if (ensuredTranslationRef.current.has(key)) return;
    ensuredTranslationRef.current.add(key);

    const run = async () => {
      const ensureResult = await ensureArticleTranslationLink(articleSlug, {
        lang,
        title,
        summary,
        content: editor.getHTML()
      });

      if (ensureResult.success && ensureResult.created) {
        await refreshTranslationStatuses();
      }
    };

    run();
  }, [editor, articleSlug, lang, loading, title, summary, refreshTranslationStatuses]);

  // ─── Save handler ─────────────────────────────────────────────────
  const handleSave = useCallback(async (newStatus) => {
    if (!editor) return;
    if (!title.trim()) {
      toast({ title: getLocaleString('title_required', lang), variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const content = editor.getHTML();
      const requestedStatus = newStatus || status;
      const saveStatus = requestedStatus === 'published' && !canPublish ? 'pending' : requestedStatus;

      if (isNew && !articleSlug) {
        // Create new
        const createPayload = {
          episodeSlug: questionInfo?.episodeSlug || null,
          questionTime: questionInfo?.time ?? null,
          questionEndTime: questionInfo?.endTime ?? null,
          title: title.trim(),
          lang,
          transcriptHtml: content,
          editor: editorAuth
        };
        console.log('[ArticleEditorPage] Creating article:', createPayload);
        const result = await createDraftFromQuestion(createPayload);
        if (!result.success) throw new Error(result.error || 'Failed to create article');
        console.log('[ArticleEditorPage] Article created:', result.data);
        setArticleSlug(result.data.slug);

        // Update if status differs or categories exist
        if (saveStatus !== 'draft' || selectedCategories.length > 0 || summary) {
          await saveArticle(result.data.slug, {
            title: title.trim(), summary, content, status: saveStatus,
            categories: selectedCategories, imageUrl, youtubeUrl, lang,
          }, editorAuth);
        }

        // Navigate to edit URL with real slug
        navigate(`/${lang}/articles/${result.data.slug}/edit`, { replace: true });
      } else {
        // Update existing
        const slug = articleSlug || articleId;
        const result = await saveArticle(slug, {
          title: title.trim(), summary, content, status: saveStatus,
          categories: selectedCategories, imageUrl, youtubeUrl, lang,
        }, editorAuth);
        if (!result.success) throw new Error(result.error);
      }

      setStatus(saveStatus);
      setHasUnsaved(false);
      localStorage.removeItem(`article_draft_${articleSlug || 'new'}`);

      const toastKey = saveStatus === 'published' ? 'article_published_toast'
                     : saveStatus === 'pending' ? 'submitted_for_review'
                     : (status === 'published' || status === 'pending') ? 'article_returned'
                     : 'article_saved';
      toast({ title: getLocaleString(toastKey, lang) });
    } catch (err) {
      console.error('[ArticleEditorPage] Save error:', err);
      toast({ title: err.message || 'Error saving', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [editor, title, summary, youtubeUrl, imageUrl, selectedCategories, status, articleSlug, articleId, isNew, questionInfo, lang, editorAuth, navigate, toast, canPublish]);

  // ─── Delete handler ───────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    const slug = articleSlug || articleId;
    if (!slug || slug === 'new') return;

    setDeleting(true);
    try {
      const result = await deleteArticle(slug);
      if (!result.success) throw new Error(result.error);
      localStorage.removeItem(`article_draft_${slug}`);
      toast({ title: getLocaleString('article_deleted', lang) });
      navigate(`/${lang}/articles`, { replace: true });
    } catch (err) {
      console.error('[ArticleEditorPage] Delete error:', err);
      toast({ title: err.message || 'Error deleting', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [articleSlug, articleId, lang, navigate, toast]);

  // ─── Slug change handler ──────────────────────────────────────────
  const handleSlugChange = useCallback(async (newSlug) => {
    const cleaned = sanitizeSlug(newSlug);
    if (!cleaned) return;

    const oldSlug = articleSlug || articleId;
    if (!oldSlug || oldSlug === 'new' || cleaned === oldSlug) {
      // Just update local state for display (will be saved later for new articles)
      setArticleSlug(cleaned);
      return;
    }

    // Persist to DB
    const result = await updateArticleSlug(oldSlug, cleaned);
    if (result.success) {
      setArticleSlug(result.slug);
      localStorage.removeItem(`article_draft_${oldSlug}`);
      navigate(`/${lang}/articles/${result.slug}/edit`, { replace: true });
      toast({ title: 'URL updated' });
    } else {
      toast({ title: result.error || 'Error updating slug', variant: 'destructive' });
    }
  }, [articleSlug, articleId, lang, navigate, toast]);

  // ─── Handle time change from player ───────────────────────────────
  const handleTimeChange = useCallback((which, newSec) => {
    if (!questionInfo) return;
    const updated = { ...questionInfo };
    if (which === 'start') {
      updated.time = newSec;
    } else {
      updated.endTime = newSec;
    }
    setQuestionInfo(updated);
    setHasUnsaved(true);
    // Recalculate timecodes in editor via TipTap API
    if (which === 'start' && editor) {
      const oldStart = questionInfo.time || 0;
      const html = editor.getHTML();
      // Replace all timecodes: [mm:ss] inside <strong> tags
      const updated_html = html.replace(/<strong([^>]*)>\[(\d+):(\d{2})\]<\/strong>/g, (match, attrs, mm, ss) => {
        const oldRelSec = parseInt(mm) * 60 + parseInt(ss);
        const absSec = oldStart + oldRelSec;
        const newRelSec = Math.max(0, absSec - newSec);
        const newMm = Math.floor(newRelSec / 60);
        const newSs = String(Math.floor(newRelSec % 60)).padStart(2, '0');
        return `<strong${attrs}>[${newMm}:${newSs}]</strong>`;
      });
      if (updated_html !== html) {
        editor.commands.setContent(updated_html);
      }
    }
  }, [questionInfo, editor]);

  // ─── Timecode click handler ───────────────────────────────────────
  const handleTimecodeClick = useCallback((e) => {
    const target = e.target;
    const strong = target.tagName === 'STRONG' ? target : target.closest?.('strong');
    if (!strong) return;
    const m = strong.textContent.match(/^\[([\d:]+)\]$/);
    if (!m) return;
    e.preventDefault();
    const parts = m[1].split(':').map(Number);
    let relSec;
    if (parts.length === 3) relSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else if (parts.length === 2) relSec = parts[0] * 60 + parts[1];
    else return;
    const absSec = (questionInfo?.time || 0) + relSec;
    if (articleAudioRef.current) {
      articleAudioRef.current.currentTime = absSec;
      articleAudioRef.current.play().catch(() => {});
    }
  }, [questionInfo]);

  // ─── Timecode styling scanner ─────────────────────────────────────
  useEffect(() => {
    if (!editor) return;
    const el = editor.view.dom;
    const scan = () => {
      el.querySelectorAll('strong').forEach(s => {
        if (/^\[[\d:]+\]$/.test(s.textContent)) {
          s.classList.add('tc-link');
        } else {
          s.classList.remove('tc-link');
        }
      });
    };
    scan();
    editor.on('update', scan);
    return () => editor.off('update', scan);
  }, [editor]);

  // ─── AI action handler ────────────────────────────────────────────
  const handleAiAction = useCallback(async (action, customPrompt) => {
    if (!editor || aiLoading) return;

    const selected = getSelectedHtml();
    if (!selected) {
      toast({ title: getLocaleString('select_text_for_ai', lang) || 'Выделите текст для AI-функции' });
      return;
    }

    setAiLoading(true);
    try {
      const html = selected.html;
      let result;
      switch (action) {
        case 'clean':
          result = await aiCleanText(html, lang);
          break;
        case 'paragraphs':
          result = await aiSplitParagraphs(html, lang);
          break;
        case 'custom':
          result = await aiCustomPrompt(html, customPrompt, lang);
          break;
        default:
          return;
      }
      if (result) {
        editor.chain().focus().insertContentAt({ from: selected.from, to: selected.to }, result).run();
        setHasUnsaved(true);
        toast({ title: getLocaleString('ai_action_done', lang) || 'AI applied successfully' });
      }
    } catch (err) {
      console.error('[AI Action] Error:', err);
      toast({ title: err.message || 'AI error', variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  }, [editor, aiLoading, lang, toast, getSelectedHtml]);

  const handleGenerateSummary = useCallback(async () => {
    if (!editor || aiLoading) return;

    const selected = getSelectedHtml();
    if (!selected) {
      toast({ title: getLocaleString('select_text_for_ai', lang) || 'Выделите текст для AI-функции' });
      return;
    }

    setAiLoading(true);
    try {
      const html = selected.html;
      const result = await aiGenerateSummary(html, lang);
      if (result) {
        setSummary(result);
        setHasUnsaved(true);
        toast({ title: getLocaleString('ai_summary_generated', lang) || 'Summary generated' });
      }
    } catch (err) {
      console.error('[AI Summary] Error:', err);
      toast({ title: err.message || 'AI error', variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  }, [editor, aiLoading, lang, toast, getSelectedHtml]);

  const handleTranslateLanguage = useCallback(async (targetLang, overwrite = false) => {
    if (!canPublish) return;
    if (!editor || !articleSlug || articleSlug === 'new') {
      toast({ title: 'Сначала сохраните статью как черновик' });
      return;
    }
    if (targetLang === lang) return;

    setTranslatingLang(targetLang);
    try {
      const translated = await aiTranslateArticle({
        title,
        summary,
        content: editor.getHTML(),
        sourceLang: lang,
        targetLang
      });

      const saveResult = await saveArticleTranslation(articleSlug, {
        sourceLang: lang,
        targetLang,
        title: translated.title,
        summary: translated.summary,
        content: translated.content,
        overwrite,
        editor: editorAuth
      });

      if (!saveResult.success) {
        if (saveResult.exists) {
          toast({ title: `${targetLang.toUpperCase()} уже переведен. Используйте «Перевести с заменой».` });
          return;
        }
        throw new Error(saveResult.error || 'Translation save failed');
      }

      await refreshTranslationStatuses();
      toast({
        title: overwrite
          ? `Перевод ${targetLang.toUpperCase()} обновлен`
          : `Перевод ${targetLang.toUpperCase()} создан`
      });
    } catch (err) {
      console.error('[Article Translation] Error:', err);
      toast({ title: err.message || 'Ошибка перевода', variant: 'destructive' });
    } finally {
      setTranslatingLang(null);
    }
  }, [canPublish, editor, articleSlug, title, summary, lang, editorAuth, refreshTranslationStatuses, toast]);

  // ─── Status badge ─────────────────────────────────────────────────
  const StatusBadge = useMemo(() => {
    const cfg = statusConfig[status] || statusConfig.draft;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color} ${cfg.border} border`}>
        <Icon className="w-3 h-3" />
        {getLocaleString(cfg.label, lang)}
      </span>
    );
  }, [status, lang]);

  // ─── Loading state ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <p className="text-sm text-slate-500">Loading editor...</p>
        </div>
      </div>
    );
  }

  // ─── Auth guard ───────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-slate-600 dark:text-slate-400">{getLocaleString('auth_required_for_editing', lang)}</p>
          <Button onClick={openAuthModal}>{getLocaleString('login', lang)}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#fafaf9] dark:bg-slate-950 overflow-y-auto">
      {/* ────────────────────────────────────────────────────────────── */}
      {/* TOP BAR                                                       */}
      {/* ────────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-[110] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 py-2.5">
          {/* Back */}
          <button
            onClick={() => {
              if (hasUnsaved && !window.confirm(getLocaleString('unsaved_changes', lang))) return;
              navigate(`/${lang}/articles`);
            }}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Title input */}
          <div className="flex-1 min-w-0">
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); setHasUnsaved(true); }}
              placeholder={getLocaleString('article_title_placeholder', lang)}
              className="w-full bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Status + unsaved */}
          <div className="flex items-center gap-2">
            {StatusBadge}
            {hasUnsaved && (
              <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" title={getLocaleString('unsaved_changes', lang)} />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Delete */}
            {articleSlug && !isNew && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                title={getLocaleString('delete', lang)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}

            {/* Preview */}
            {articleSlug && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`/${lang}/articles/${articleSlug}`, '_blank')}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                <Eye className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">{getLocaleString('preview', lang)}</span>
              </Button>
            )}

            {/* Save draft */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
              <span className="hidden sm:inline">{getLocaleString('save_draft', lang)}</span>
            </Button>

            {/* Submit for review */}
            {status !== 'published' && status !== 'pending' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave('pending')}
                disabled={saving}
                className="border-orange-300 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10"
              >
                <Send className="w-4 h-4 mr-1.5" />
                <span className="hidden md:inline">{getLocaleString('submit_for_review', lang)}</span>
              </Button>
            )}

            {/* Return for revision (from pending/published → draft) */}
            {(status === 'pending' || status === 'published') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="border-yellow-300 dark:border-yellow-500/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-500/10"
              >
                <FileEdit className="w-4 h-4 mr-1.5" />
                <span className="hidden md:inline">{getLocaleString('return_for_revision', lang)}</span>
              </Button>
            )}

            {/* Publish (allowed only for main publisher) */}
            {canPublish && (
              <Button
                size="sm"
                onClick={() => handleSave('published')}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Globe className="w-4 h-4 mr-1.5" />}
                <span className="hidden sm:inline">{getLocaleString('publish', lang)}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Formatting toolbar */}
        {editor && <EditorToolbar editor={editor} onAiAction={handleAiAction} aiLoading={aiLoading} lang={lang} />}

        {/* Mini player */}
        {audioUrl && questionInfo && (
          <MiniPlayer
            audioUrl={audioUrl}
            audioRef={articleAudioRef}
            episodeSlug={questionInfo.episodeSlug}
            questionTime={questionInfo.time}
            questionEndTime={questionInfo.endTime}
            lang={lang}
          />
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* EDITOR CONTENT AREA                                           */}
      {/* ────────────────────────────────────────────────────────────── */}
      {/* Timecode clickable styles */}
      <style>{`
        /* ── Bold / Italic / Underline visibility ── */
        .ProseMirror strong:not(.tc-link) {
          font-weight: 800;
          color: #1e293b;
        }
        .dark .ProseMirror strong:not(.tc-link) {
          color: #f1f5f9;
        }
        .ProseMirror em {
          font-style: italic;
          color: #475569;
        }
        .dark .ProseMirror em {
          color: #cbd5e1;
        }
        .ProseMirror u {
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-thickness: 2px;
          text-decoration-color: rgba(124, 58, 237, 0.4);
        }

        /* ── Headings ── */
        .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: 700;
          line-height: 1.3;
          margin-top: 1.4em;
          margin-bottom: 0.5em;
          color: #1e293b;
        }
        .dark .ProseMirror h2 {
          color: #e2e8f0;
        }
        .ProseMirror h3 {
          font-size: 1.25em;
          font-weight: 600;
          line-height: 1.4;
          margin-top: 1.2em;
          margin-bottom: 0.4em;
          color: #334155;
        }
        .dark .ProseMirror h3 {
          color: #cbd5e1;
        }

        /* ── Paragraph rhythm ── */
        .ProseMirror p {
          margin-top: 0;
          margin-bottom: 0.75em;
          text-indent: 1em;
          line-height: 1.72;
        }

        /* ── Highlight (text background colors) ── */
        .ProseMirror mark {
          padding: 2px 4px;
          border-radius: 3px;
          background-color: #fef08a;
        }
        .ProseMirror mark[data-color="#fef08a"] {
          background-color: #fef08a;
        }
        .ProseMirror mark[data-color="#bbf7d0"] {
          background-color: #bbf7d0;
        }
        .ProseMirror mark[data-color="#bfdbfe"] {
          background-color: #bfdbfe;
        }
        .ProseMirror mark[data-color="#fbcfe8"] {
          background-color: #fbcfe8;
        }
        .ProseMirror mark[data-color="#e9d5ff"] {
          background-color: #e9d5ff;
        }

        /* ── Blockquote (Question style) ── */
        .ProseMirror blockquote {
          position: relative;
          margin: 1.5em 0;
          padding: 1.2em 1.5em 1.2em 1.8em;
          background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
          border-left: 4px solid #8b5cf6;
          border-radius: 0 12px 12px 0;
          font-style: normal;
          color: #4c1d95;
          box-shadow: 0 1px 3px rgba(139, 92, 246, 0.08);
        }
        .ProseMirror blockquote::before {
          content: "\u201C";
          position: absolute;
          top: -0.15em;
          left: 0.15em;
          font-size: 3em;
          line-height: 1;
          color: rgba(139, 92, 246, 0.15);
          font-family: Georgia, serif;
          pointer-events: none;
        }
        .ProseMirror blockquote p {
          margin: 0.3em 0;
          color: #4c1d95;
          font-weight: 500;
          text-indent: 0;
        }
        .dark .ProseMirror blockquote {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%);
          border-left-color: #a78bfa;
          color: #c4b5fd;
        }
        .dark .ProseMirror blockquote::before {
          color: rgba(167, 139, 250, 0.12);
        }
        .dark .ProseMirror blockquote p {
          color: #c4b5fd;
        }

        /* ── Question block ── */
        .ProseMirror .question-block {
          position: relative;
          margin: 1.8em 0;
          padding: 1.4em 1.6em 1.4em 1.8em;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 12px;
          color: #78350f;
        }
        .ProseMirror .question-block::before {
          content: '?';
          position: absolute;
          top: -0.15em;
          left: 0.15em;
          font-size: 3em;
          line-height: 1;
          color: rgba(217, 119, 6, 0.15);
          font-family: Georgia, serif;
          font-weight: 700;
          pointer-events: none;
        }
        .ProseMirror .question-block p {
          margin: 0.2em 0;
          color: #78350f;
          font-weight: 500;
          font-size: 1.1em;
          line-height: 1.6;
          font-style: italic;
          text-indent: 0;
        }
        .dark .ProseMirror .question-block {
          background: rgba(251, 191, 36, 0.06);
          border-color: rgba(251, 191, 36, 0.2);
          color: #fde68a;
        }
        .dark .ProseMirror .question-block::before {
          color: rgba(251, 191, 36, 0.12);
        }
        .dark .ProseMirror .question-block p {
          color: #fde68a;
        }

        /* ── Timecode links ── */
        .ProseMirror strong.tc-link {
          cursor: pointer;
          color: #7c3aed !important;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.8em;
          background: rgba(124, 58, 237, 0.1);
          padding: 2px 6px;
          border-radius: 5px;
          border: 1px solid rgba(124, 58, 237, 0.25);
          transition: all 0.15s;
          text-decoration: none;
          box-shadow: 0 1px 2px rgba(124, 58, 237, 0.08);
          position: relative;
          font-weight: 600;
        }
        .ProseMirror strong.tc-link::before {
          content: '\u25B6';
          font-size: 0.65em;
          margin-right: 2px;
          opacity: 0.6;
        }
        .ProseMirror strong.tc-link:hover {
          color: #6d28d9 !important;
          background: rgba(124, 58, 237, 0.18);
          border-color: rgba(124, 58, 237, 0.5);
          box-shadow: 0 1px 4px rgba(124, 58, 237, 0.15);
          transform: translateY(-0.5px);
        }
        .dark .ProseMirror strong.tc-link {
          color: #a78bfa !important;
          background: rgba(167, 139, 250, 0.12);
          border-color: rgba(167, 139, 250, 0.25);
          box-shadow: 0 1px 2px rgba(167, 139, 250, 0.08);
        }
        .dark .ProseMirror strong.tc-link:hover {
          color: #c4b5fd !important;
          background: rgba(167, 139, 250, 0.22);
          border-color: rgba(167, 139, 250, 0.5);
          box-shadow: 0 1px 4px rgba(167, 139, 250, 0.15);
        }
      `}</style>
      <div className="mx-auto max-w-4xl px-2 mt-4" onClick={handleTimecodeClick}>
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700/50 overflow-hidden min-h-[60vh]">
          <EditorContent editor={editor} spellCheck="false" />
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* BOTTOM SETTINGS PANEL (after editor)                          */}
      {/* ────────────────────────────────────────────────────────────── */}
      <BottomSettingsPanel
        summary={summary}
        setSummary={setSummary}
        youtubeUrl={youtubeUrl}
        setYoutubeUrl={setYoutubeUrl}
        editorName={editorName}
        setEditorName={setEditorName}
        articleDate={articleDate}
        setArticleDate={setArticleDate}
        articleSlug={articleSlug}
        onSlugChange={handleSlugChange}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        allCategories={allCategories}
        questionInfo={questionInfo}
        onTimeChange={handleTimeChange}
        onGenerateSummary={handleGenerateSummary}
        aiLoading={aiLoading}
        canManageTranslations={canPublish}
        translationStatusByLang={translationStatusByLang}
        translatingLang={translatingLang}
        onTranslateLanguage={handleTranslateLanguage}
        lang={lang}
        status={status}
        onSaveStatus={handleSave}
        saving={saving}
        canPublish={canPublish}
        onDelete={() => setShowDeleteConfirm(true)}
      />

      <div className="h-32" />

      {/* ────────────────────────────────────────────────────────────── */}
      {/* DELETE CONFIRMATION DIALOG                                    */}
      {/* ────────────────────────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-sm mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-100 dark:bg-red-500/20 rounded-xl">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {getLocaleString('delete_article', lang)}
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {getLocaleString('delete_article_confirm', lang)}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                {getLocaleString('cancel', lang)}
              </Button>
              <Button
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
                {getLocaleString('delete', lang)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleEditorPage;
