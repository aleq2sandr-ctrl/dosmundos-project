/**
 * Google Analytics 4 Service
 * Handles all analytics tracking for the podcast application
 */

import ReactGA from 'react-ga4';

// Configuration
const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID;
const IS_PRODUCTION = import.meta.env.PROD;
const DEBUG_MODE = !IS_PRODUCTION;

let isInitialized = false;

/**
 * Initialize Google Analytics 4
 */
export const initGA4 = () => {
  if (!GA4_MEASUREMENT_ID || GA4_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
    console.warn('[Analytics] GA4 Measurement ID not configured');
    return false;
  }

  if (isInitialized) {
    console.log('[Analytics] GA4 already initialized');
    return true;
  }

  try {
    ReactGA.initialize(GA4_MEASUREMENT_ID, {
      testMode: DEBUG_MODE,
      gaOptions: {
        debug_mode: DEBUG_MODE,
        send_page_view: false, // We'll handle page views manually
      },
    });

    isInitialized = true;
    console.log('[Analytics] GA4 initialized successfully');
    return true;
  } catch (error) {
    console.error('[Analytics] Failed to initialize GA4:', error);
    return false;
  }
};

/**
 * Track page view
 * @param {string} path - Page path
 * @param {string} title - Page title
 */
export const trackPageView = (path, title) => {
  if (!isInitialized) return;

  try {
    ReactGA.send({
      hitType: 'pageview',
      page: path,
      title: title,
    });

    if (DEBUG_MODE) {
      console.log('[Analytics] Page view:', { path, title });
    }
  } catch (error) {
    console.error('[Analytics] Failed to track page view:', error);
  }
};

/**
 * Track custom event
 * @param {string} category - Event category
 * @param {string} action - Event action
 * @param {string} label - Event label (optional)
 * @param {number} value - Event value (optional)
 * @param {object} additionalParams - Additional parameters
 */
export const trackEvent = (category, action, label = null, value = null, additionalParams = {}) => {
  if (!isInitialized) return;

  try {
    const eventParams = {
      category,
      label,
      value,
      ...additionalParams,
    };

    // Remove null/undefined values
    Object.keys(eventParams).forEach(
      key => (eventParams[key] === null || eventParams[key] === undefined) && delete eventParams[key]
    );

    ReactGA.event(action, eventParams);

    if (DEBUG_MODE) {
      console.log('[Analytics] Event:', action, eventParams);
    }
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error);
  }
};

// ==================== EPISODE LISTENING EVENTS ====================

/**
 * Track when user starts playing an episode
 * @param {object} episode - Episode data
 */
export const trackPlayEpisode = (episode) => {
  trackEvent('Episode', 'play_episode', episode.title, null, {
    episode_id: episode.id,
    episode_slug: episode.slug,
    episode_language: episode.language,
    episode_duration: episode.duration_seconds,
  });
};

/**
 * Track when user pauses an episode
 * @param {object} episode - Episode data
 * @param {number} currentTime - Current playback time in seconds
 */
export const trackPauseEpisode = (episode, currentTime) => {
  trackEvent('Episode', 'pause_episode', episode.title, Math.round(currentTime), {
    episode_id: episode.id,
    episode_slug: episode.slug,
    progress_percent: episode.duration_seconds
      ? Math.round((currentTime / episode.duration_seconds) * 100)
      : 0,
  });
};

/**
 * Track episode completion (90%+ listened)
 * @param {object} episode - Episode data
 */
export const trackCompleteEpisode = (episode) => {
  trackEvent('Episode', 'complete_episode', episode.title, 100, {
    episode_id: episode.id,
    episode_slug: episode.slug,
    episode_language: episode.language,
  });
};

/**
 * Track episode listening progress milestones (25%, 50%, 75%)
 * @param {object} episode - Episode data
 * @param {number} percent - Progress percentage
 */
export const trackEpisodeProgress = (episode, percent) => {
  trackEvent('Episode', 'episode_progress', episode.title, percent, {
    episode_id: episode.id,
    episode_slug: episode.slug,
    milestone: `${percent}%`,
  });
};

/**
 * Track audio seeking/scrubbing
 * @param {object} episode - Episode data
 * @param {number} fromTime - Time seeked from
 * @param {number} toTime - Time seeked to
 */
export const trackSeekAudio = (episode, fromTime, toTime) => {
  const direction = toTime > fromTime ? 'forward' : 'backward';
  const distance = Math.abs(toTime - fromTime);

  trackEvent('Episode', 'seek_audio', episode.title, Math.round(distance), {
    episode_id: episode.id,
    seek_direction: direction,
    seek_from: Math.round(fromTime),
    seek_to: Math.round(toTime),
  });
};

// ==================== USER INTERACTION EVENTS ====================

/**
 * Track episode click from list
 * @param {object} episode - Episode data
 * @param {string} source - Source of click (e.g., 'episodes_list', 'search_results')
 */
export const trackEpisodeClick = (episode, source = 'episodes_list') => {
  trackEvent('Navigation', 'episode_click', episode.title, null, {
    episode_id: episode.id,
    episode_slug: episode.slug,
    source,
  });
};

/**
 * Track search query
 * @param {string} query - Search query
 * @param {number} resultsCount - Number of results
 */
export const trackSearch = (query, resultsCount) => {
  trackEvent('Search', 'search_query', query, resultsCount, {
    query_length: query.length,
  });
};

/**
 * Track filter usage
 * @param {string} filterType - Type of filter
 * @param {string} filterValue - Filter value
 */
export const trackFilter = (filterType, filterValue) => {
  trackEvent('Filter', 'apply_filter', filterType, null, {
    filter_value: filterValue,
  });
};

/**
 * Track language change
 * @param {string} fromLanguage - Previous language
 * @param {string} toLanguage - New language
 */
export const trackLanguageChange = (fromLanguage, toLanguage) => {
  trackEvent('Settings', 'language_change', `${fromLanguage} -> ${toLanguage}`, null, {
    from_language: fromLanguage,
    to_language: toLanguage,
  });
};

/**
 * Track transcript download
 * @param {object} episode - Episode data
 * @param {string} format - Export format (e.g., 'txt', 'pdf')
 */
export const trackTranscriptDownload = (episode, format) => {
  trackEvent('Download', 'download_transcript', episode.title, null, {
    episode_id: episode.id,
    download_format: format,
  });
};

/**
 * Track sharing
 * @param {string} platform - Sharing platform
 * @param {object} episode - Episode data
 */
export const trackShare = (platform, episode) => {
  trackEvent('Social', 'share', platform, null, {
    episode_id: episode.id,
    episode_title: episode.title,
  });
};

// ==================== OFFLINE & CACHE EVENTS ====================

/**
 * Track offline mode activation
 */
export const trackOfflineModeEnabled = () => {
  trackEvent('Offline', 'offline_mode_enabled', 'User enabled offline mode');
};

/**
 * Track episode download for offline
 * @param {object} episode - Episode data
 */
export const trackOfflineDownload = (episode) => {
  trackEvent('Offline', 'download_for_offline', episode.title, null, {
    episode_id: episode.id,
  });
};

// ==================== ERROR TRACKING ====================

/**
 * Track errors
 * @param {string} errorType - Type of error
 * @param {string} errorMessage - Error message
 * @param {string} component - Component where error occurred
 */
export const trackError = (errorType, errorMessage, component = 'unknown') => {
  trackEvent('Error', errorType, errorMessage, null, {
    component,
    fatal: false,
  });
};

// ==================== PERFORMANCE TRACKING ====================

/**
 * Track page load time
 * @param {string} pageName - Name of the page
 * @param {number} loadTime - Load time in milliseconds
 */
export const trackPageLoadTime = (pageName, loadTime) => {
  trackEvent('Performance', 'page_load_time', pageName, Math.round(loadTime), {
    load_time_ms: Math.round(loadTime),
  });
};

/**
 * Track audio loading time
 * @param {object} episode - Episode data
 * @param {number} loadTime - Load time in milliseconds
 */
export const trackAudioLoadTime = (episode, loadTime) => {
  trackEvent('Performance', 'audio_load_time', episode.title, Math.round(loadTime), {
    episode_id: episode.id,
    load_time_ms: Math.round(loadTime),
  });
};

// Export all functions as default object
export default {
  initGA4,
  trackPageView,
  trackEvent,
  trackPlayEpisode,
  trackPauseEpisode,
  trackCompleteEpisode,
  trackEpisodeProgress,
  trackSeekAudio,
  trackEpisodeClick,
  trackSearch,
  trackFilter,
  trackLanguageChange,
  trackTranscriptDownload,
  trackShare,
  trackOfflineModeEnabled,
  trackOfflineDownload,
  trackError,
  trackPageLoadTime,
  trackAudioLoadTime,
};

