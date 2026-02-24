import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, ArrowRight, Youtube, Clock, Calendar, FileEdit, FileCheck, FileSearch } from 'lucide-react';
import { getPluralizedLocaleString, getLocaleString } from '@/lib/locales';
import { formatArticleDate } from '@/lib/utils';
import { useEditorAuth } from '@/contexts/EditorAuthContext';

// Color palette for categories (same as ArticlesPage)
// Slug-based color mapping — works for all languages
const categoryColorsBySlug = {
  'teacher-plants-diet': 'bg-green-100 text-green-800 border-green-200',
  'healing-energy-practices': 'bg-purple-100 text-purple-800 border-purple-200',
  'relationships-family': 'bg-pink-100 text-pink-800 border-pink-200',
  'inner-development': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'health-nutrition': 'bg-red-100 text-red-800 border-red-200',
  'energy-protection-cleansing': 'bg-orange-100 text-orange-800 border-orange-200',
  'meditations': 'bg-blue-100 text-blue-800 border-blue-200',
  'default': 'bg-slate-100 text-slate-600 border-slate-200'
};

const getCategoryColor = (cat) => {
  // Support both {slug, name} objects and plain strings
  const slug = typeof cat === 'object' ? cat?.slug : cat;
  if (slug && categoryColorsBySlug[slug]) return categoryColorsBySlug[slug];
  return categoryColorsBySlug.default;
};

const statusConfig = {
  draft:     { icon: FileEdit,   color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  pending:   { icon: FileSearch, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
  published: { icon: FileCheck,  color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
};

const ArticleCard = memo(({ 
  article, 
  lang, 
  isLast,
  lastArticleElementRef 
}) => {
  const { isAuthenticated } = useEditorAuth();
  const {
    id,
    title,
    summary,
    categories,
    author,
    youtubeUrl,
    publishedAt,
    readingTime,
    status
  } = article;

  const showStatus = status && (status === 'published' || isAuthenticated);
  const statusCfg = status ? statusConfig[status] : null;

  return (
    <div 
      ref={isLast ? lastArticleElementRef : null}
      className="h-full"
    >
      <Link 
        to={`/${lang}/articles/${id}`}
        className="group h-full block"
      >
        <Card className="h-full bg-white border-slate-200 text-slate-900 overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 group-hover:border-slate-300 flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex flex-wrap gap-1">
                {(Array.isArray(categories) ? categories : []).map((cat, index) => {
                  const catName = typeof cat === 'object' ? cat.name : cat;
                  return (
                    <span
                      key={index}
                      className={`px-2 py-1 rounded-full text-xs font-medium tracking-wide uppercase border font-sans ${getCategoryColor(cat)}`}
                    >
                      {catName}
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {showStatus && statusCfg && (() => {
                  const Icon = statusCfg.icon;
                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                      <Icon className="w-3 h-3" />
                      <span className="hidden sm:inline">{getLocaleString(status === 'draft' ? 'status_draft' : status === 'pending' ? 'status_pending' : 'status_published', lang)}</span>
                    </span>
                  );
                })()}
                {youtubeUrl && (
                  <Youtube className="w-5 h-5 text-red-600 opacity-80" />
                )}
              </div>
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
    readingTime: PropTypes.number,
    status: PropTypes.string
  }).isRequired,
  lang: PropTypes.string.isRequired,
  isLast: PropTypes.bool,
  lastArticleElementRef: PropTypes.func
};

export default ArticleCard;