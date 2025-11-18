import React, { useEffect, useState, useRef, useCallback } from 'react';

const MAX_LOGS = 300;
const LEVEL_COLORS = {
  debug: 'text-slate-300',
  info: 'text-blue-300',
  warn: 'text-yellow-300',
  error: 'text-red-300'
};

const formatTime = (ts) => {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString();
  } catch {
    return String(ts);
  }
};

const DevLogPanel = ({ initialOpen = false }) => {
  const [open, setOpen] = useState(initialOpen);
  const [logs, setLogs] = useState([]);
  const listRef = useRef(null);

  const pushLog = useCallback((entry) => {
    setLogs(prev => {
      const next = [...prev, entry].slice(-MAX_LOGS);
      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail || {};
      const { level = 'debug', args = [], ts = Date.now() } = detail;
      const text = args.map(a => {
        try {
          if (typeof a === 'string') return a;
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      }).join(' ');
      pushLog({ level, text, ts });
    };
    window.addEventListener('app-log', handler);
    return () => window.removeEventListener('app-log', handler);
  }, [pushLog]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [logs, open]);

  if (!import.meta.env.DEV && String(import.meta.env.VITE_DEBUG_PANEL).toLowerCase() !== 'true') {
    return null;
  }

  return (
    <div style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 9999 }}>
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-1 text-xs rounded bg-slate-700/80 border border-slate-600 text-slate-200 hover:bg-slate-600"
      >
        {open ? 'Hide Logs' : 'Show Logs'}
      </button>
      {open && (
        <div className="mt-2 w-[380px] h-[260px] bg-slate-900/90 border border-slate-700 rounded-lg shadow-lg flex flex-col">
          <div className="px-2 py-1 text-xs text-slate-400 border-b border-slate-700 flex justify-between">
            <span>Dev Logs</span>
            <button
              onClick={() => setLogs([])}
              className="text-slate-400 hover:text-slate-200"
            >
              Clear
            </button>
          </div>
          <div ref={listRef} className="flex-1 overflow-auto p-2 space-y-1">
            {logs.map((l, idx) => (
              <div key={idx} className={`text-[11px] font-mono ${LEVEL_COLORS[l.level] || 'text-slate-300'}`}>
                <span className="text-slate-500 mr-2">{formatTime(l.ts)}</span>
                <span className="uppercase mr-2">{l.level}</span>
                <span>{l.text}</span>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-xs text-slate-500">
                No logs yet. Actions on this page will appear here.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DevLogPanel;


