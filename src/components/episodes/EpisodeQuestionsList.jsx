
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { getLocaleString } from '@/lib/locales';

const EpisodeQuestionsList = React.memo(({ questions, episodeSlug, currentLanguage, updateTimestamp }) => {
  const navigate = useNavigate();
  const { lang } = useParams();
  const langPrefix = lang || currentLanguage || 'ru';

  if (!questions || questions.length === 0) {
    return (
      <div className="mt-3 pl-2 py-1 text-xs text-slate-400">
        {getLocaleString('noQuestionsAddedYet', currentLanguage)}
      </div>
    );
  }

  const handleQuestionClick = (question) => {
    // Use compact URL format: /lang/slug#seconds
    // This is shorter and auto-plays by default
    const timeSeconds = Math.floor(question.time || 0);
    navigate(`/${langPrefix}/${episodeSlug}#${timeSeconds}`);
  };

  // Сортируем вопросы по времени как fallback
  const sortedQuestions = [...questions].sort((a, b) => (a.time || 0) - (b.time || 0));

  return (
    <div key={`questions-${episodeSlug}-${updateTimestamp || ''}`} className="mt-3 pl-2">
      <div className="text-xs text-purple-300 font-semibold mb-1 py-1">
        {getLocaleString('questions', currentLanguage)}
      </div>
      <ul className="space-y-1.5 overflow-hidden pl-2 border-l-2 border-purple-500/20 animate-fade-in">
        {sortedQuestions.map(question => (
          <li
            key={`${question.id}-${question.lang || 'unknown'}-${episodeSlug}`}
            className="animate-slide-in-left"
          >
            <button 
              onClick={() => handleQuestionClick(question)}
              className="text-xs text-slate-300 hover:text-purple-200 hover:underline flex items-start gap-1.5 text-left w-full"
            >
              <HelpCircle className="h-3 w-3 text-purple-400 shrink-0 mt-0.5" />
              <span className="flex-grow" title={question.title}>{question.title || getLocaleString('untitledQuestion', currentLanguage)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
});

export default EpisodeQuestionsList;
