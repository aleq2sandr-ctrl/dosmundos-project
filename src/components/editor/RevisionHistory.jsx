import React, { useState, useEffect } from 'react';
import { getArticleRevisions, restoreRevision } from '@/services/articleService';
import { Button } from '@/components/ui/button';
import { History, RotateCcw, ChevronDown, ChevronUp, User, Clock } from 'lucide-react';
import { getLocaleString } from '@/lib/locales';

const RevisionHistory = ({ articleId, lang, editor, onRestore, currentLanguage }) => {
  const [revisions, setRevisions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const fetchRevisions = async () => {
    if (!articleId) return;
    setLoading(true);
    const data = await getArticleRevisions(articleId);
    // Filter to only text edits (not status changes)
    setRevisions(data.filter(r => r.edit_type === 'text_edit' || r.edit_type === 'restore'));
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && articleId) {
      fetchRevisions();
    }
  }, [isOpen, articleId]);

  const handleRestore = async (revision) => {
    if (!editor || !window.confirm(getLocaleString('confirm_restore_revision', currentLanguage))) return;
    
    setRestoring(revision.id);
    const result = await restoreRevision(articleId, revision, lang, editor);
    setRestoring(null);

    if (result.success) {
      if (onRestore) onRestore();
      fetchRevisions();
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(currentLanguage === 'ru' ? 'ru-RU' : currentLanguage === 'es' ? 'es-ES' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionLabel = (revision) => {
    switch (revision.edit_type) {
      case 'text_edit': return getLocaleString('edit', currentLanguage);
      case 'restore': return getLocaleString('restored', currentLanguage);
      case 'create': return getLocaleString('created', currentLanguage);
      default: return revision.edit_type;
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <History className="h-4 w-4" />
          {getLocaleString('revision_history', currentLanguage)}
          {revisions.length > 0 && (
            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
              {revisions.length}
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {isOpen && (
        <div className="border-t border-slate-200 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-slate-500">
              {getLocaleString('loading', currentLanguage)}
            </div>
          ) : revisions.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              {getLocaleString('no_revisions', currentLanguage)}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {revisions.map((rev) => (
                <div key={rev.id} className="p-3 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <User className="h-3 w-3" />
                        <span className="truncate">{rev.editor_name || rev.editor_email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(rev.created_at)}</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                          {getActionLabel(rev)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestore(rev)}
                      disabled={restoring === rev.id}
                      className="text-xs h-7 text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                      title={getLocaleString('restore_revision', currentLanguage)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      {restoring === rev.id ? '...' : getLocaleString('restore', currentLanguage)}
                    </Button>
                  </div>
                  
                  {/* Expandable diff preview */}
                  {expandedId === rev.id && rev.content_before && (
                    <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600 max-h-40 overflow-y-auto">
                      <pre className="whitespace-pre-wrap font-mono">
                        {(() => {
                          try {
                            const before = JSON.parse(rev.content_before);
                            return `Title: ${before.title || '—'}\nSummary: ${before.summary || '—'}`;
                          } catch {
                            return rev.content_before.substring(0, 200);
                          }
                        })()}
                      </pre>
                    </div>
                  )}
                  <button
                    onClick={() => setExpandedId(expandedId === rev.id ? null : rev.id)}
                    className="text-xs text-slate-400 hover:text-slate-600 mt-1"
                  >
                    {expandedId === rev.id ? '▲' : '▼'} {getLocaleString('details', currentLanguage)}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RevisionHistory;
