const isProd = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD;

const getDebugEnabled = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env.VITE_DEBUG !== 'undefined') {
      return String(import.meta.env.VITE_DEBUG).toLowerCase() === 'true';
    }
  } catch (_) {}
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem('DEBUG');
      if (val != null) return String(val).toLowerCase() === 'true';
    }
  } catch (_) {}
  return !isProd; // default: debug in development
};

let debugEnabled = getDebugEnabled();

export const setDebug = (enabled) => {
  debugEnabled = Boolean(enabled);
};

const safeCall = (fn, ...args) => {
  try {
    // eslint-disable-next-line no-console
    fn(...args);
  } catch (_) {}
};

const logger = {
  debug: (...args) => {
    if (!debugEnabled) return;
    const payload = { level: 'debug', args, ts: Date.now() };
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('app-log', { detail: payload })); } catch (_) {}
    safeCall(console.debug || console.log, ...args);
  },
  info: (...args) => {
    const payload = { level: 'info', args, ts: Date.now() };
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('app-log', { detail: payload })); } catch (_) {}
    safeCall(console.info || console.log, ...args);
  },
  warn: (...args) => {
    const payload = { level: 'warn', args, ts: Date.now() };
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('app-log', { detail: payload })); } catch (_) {}
    safeCall(console.warn, ...args);
  },
  error: (...args) => {
    const payload = { level: 'error', args, ts: Date.now() };
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('app-log', { detail: payload })); } catch (_) {}
    safeCall(console.error, ...args);
  },
};

export default logger;


