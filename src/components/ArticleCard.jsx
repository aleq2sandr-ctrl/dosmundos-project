import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, ArrowRight, Youtube, Clock, Calendar } from 'lucide-react';
import { getPluralizedLocaleString } from '@/lib/locales';
import { formatArticleDate } from '@/lib/utils';

// Color palette for categories (same as ArticlesPage)
const categoryColors = {
  'Растения Учителя и Процесс Диеты': 'bg-green-100 text-green-800 border-green-200',
  'Целительство и Энергетические практики': 'bg-purple-100 text-purple-800 border-purple-200',
  'Взаимоотношения и семья': 'bg-pink-100 text-pink-800 border-pink-200',
  'Внутренние развитие': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Здоровье и Питание': 'bg-red-100 text-red-800 border-red-200',
  'Энергетическая защита и очищение': 'bg-orange-100 text-orange-800 border-orange-200',
  'Медитации': 'bg-blue-100 text-blue-800 border-blue-200',
  'default': 'bg-slate-100 text-slate-600 border-slate-200'
};

const getCategoryColor = (category) => {
  return categoryColors[category] || categoryColors.default;
};

const ArticleCard = memo(({ 
  article, 
  lang, 
  isLast,
  lastArticleElementRef 
}) => {
  const {
    id,
    title,
    summary,
    categories,
    author,
    youtubeUrl,
    publishedAt,
    readingTime
  } = article;

  return (
    <div 
      ref={isLast ? lastArticleElementRef : null}
      className="h-full animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <Link 
        to={`/${lang}/articles/${id}`}
        className="group h-full block"
      >
        <Card className="h-full bg-white border-slate-200 text-slate-900 overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 group-hover:border-slate-300 flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex flex-wrap gap-1">
                {(Array.isArray(categories) ? categories : []).map((cat, index) => (
                  <span
                    key={index}
                    className={`px-2 py-1 rounded-full text-xs font-medium tracking-wide uppercase border font-sans ${getCategoryColor(cat)}`}
                  >
                    {cat}
                  </span>
                ))}
              </div>
              {youtubeUrl && (
                <Youtube className="w-5 h-5 text-red-600 opacity-80" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold leading-tight group-hover:text-purple-700 transition-colors">
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col">
            <CardDescription className="text-slate-600 text-base leading-relaxed line-clamp-3 mb-6 flex-grow">
              {summary}
            </CardDescription>
            
            <div className="space-y-3 mt-auto">
              {/* Date and Reading Time */}
              <div className="flex items-center gap-4 text-xs text-slate-500 font-sans">
                {publishedAt && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatArticleDate(publishedAt, lang)}</span>
                  </div>
                )}
                {readingTime && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{getPluralizedLocaleString('reading_time_minutes', lang, readingTime, { count: readingTime })}</span>
                  </div>
                )}
              </div>
              
              {/* Author and Read Link */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider font-medium">
                  <User className="w-3 h-3" />
                  {author}
                </div>
                <span className="flex items-center gap-2 text-sm text-purple-700 font-medium group-hover:translate-x-1 transition-transform italic font-serif">
                  {getPluralizedLocaleString('read_article', lang, 1)}
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
});

ArticleCard.displayName = 'ArticleCard';

ArticleCard.propTypes = {
  article: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    summary: PropTypes.string,
    categories: PropTypes.array,
    author: PropTypes.string,
    youtubeUrl: PropTypes.string,
    publishedAt: PropTypes.string,
    readingTime: PropTypes.number
  }).isRequired,
  lang: PropTypes.string.isRequired,
  isLast: PropTypes.bool,
  lastArticleElementRef: PropTypes.func
};

export default ArticleCard;