import React from 'react';

const ArticleCardSkeleton = () => {
  return (
    <div className="h-full bg-white border border-slate-200 rounded-lg overflow-hidden animate-pulse">
      {/* Header skeleton */}
      <div className="p-6 pb-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-2">
            <div className="h-6 w-24 bg-slate-200 rounded-full"></div>
            <div className="h-6 w-20 bg-slate-200 rounded-full"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-8 bg-slate-200 rounded w-full"></div>
          <div className="h-6 bg-slate-200 rounded w-4/5"></div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="px-6 pb-4 flex-grow space-y-3">
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 rounded w-full"></div>
          <div className="h-4 bg-slate-200 rounded w-full"></div>
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="px-6 pt-3 pb-4 border-t border-slate-100 space-y-2">
        <div className="flex justify-between items-center">
          <div className="h-4 bg-slate-200 rounded w-24"></div>
          <div className="h-4 bg-slate-200 rounded w-16"></div>
        </div>
      </div>
    </div>
  );
};

export default ArticleCardSkeleton;
