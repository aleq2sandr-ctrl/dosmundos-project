/**
 * Google Analytics Data Service
 * Fetches analytics data from GA4 via server proxy
 */

const API_BASE_URL = '/api/analytics';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get data from cache if available and not expired
 */
const getFromCache = (key) => {
  try {
    const cached = localStorage.getItem(`ga_cache_${key}`);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const isExpired = Date.now() - timestamp > CACHE_DURATION;

    if (isExpired) {
      localStorage.removeItem(`ga_cache_${key}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[GA Data] Cache read error:', error);
    return null;
  }
};

/**
 * Save data to cache
 */
const saveToCache = (key, data) => {
  try {
    localStorage.setItem(
      `ga_cache_${key}`,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.error('[GA Data] Cache write error:', error);
  }
};

/**
 * Fetch data from server with caching
 */
const fetchData = async (endpoint, params = {}, useCache = true) => {
  const cacheKey = `${endpoint}_${JSON.stringify(params)}`;

  // Check cache first
  if (useCache) {
    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
      console.log('[GA Data] Using cached data for:', endpoint);
      return cachedData;
    }
  }

  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Save to cache
    if (useCache) {
      saveToCache(cacheKey, data);
    }

    return data;
  } catch (error) {
    console.error('[GA Data] Fetch error:', error);
    throw error;
  }
};

/**
 * Generate mock data for development/demo
 */
const generateMockData = (type, params = {}) => {
  const { startDate, endDate, period = '7d' } = params;

  switch (type) {
    case 'overview':
      return {
        totalUsers: 1247,
        totalSessions: 3521,
        totalPageViews: 8934,
        avgSessionDuration: 245, // seconds
        bounceRate: 32.5,
        change: {
          users: 12.3,
          sessions: 8.7,
          pageViews: 15.2,
          sessionDuration: -3.4,
          bounceRate: -2.1,
        },
      };

    case 'visitors':
      return generateVisitorsData(period);

    case 'popular_episodes':
      return [
        { title: 'Эпизод 1: Введение в два мира', views: 523, avgDuration: 1245 },
        { title: 'Эпизод 2: Культурные различия', views: 487, avgDuration: 1189 },
        { title: 'Эпизод 3: Язык и общение', views: 445, avgDuration: 1356 },
        { title: 'Эпизод 4: Традиции и праздники', views: 398, avgDuration: 1423 },
        { title: 'Эпизод 5: Кухня двух миров', views: 376, avgDuration: 1167 },
        { title: 'Эпизод 6: Музыка и искусство', views: 342, avgDuration: 1289 },
        { title: 'Эпизод 7: История миграции', views: 321, avgDuration: 1534 },
        { title: 'Эпизод 8: Образование', views: 298, avgDuration: 1245 },
        { title: 'Эпизод 9: Работа за границей', views: 276, avgDuration: 1398 },
        { title: 'Эпизод 10: Семейные ценности', views: 254, avgDuration: 1456 },
      ];

    case 'geography':
      return [
        { country: 'Россия', city: 'Москва', users: 342, sessions: 876 },
        { country: 'Россия', city: 'Санкт-Петербург', users: 198, sessions: 523 },
        { country: 'Испания', city: 'Мадрид', users: 165, sessions: 412 },
        { country: 'Испания', city: 'Барселона', users: 143, sessions: 378 },
        { country: 'Аргентина', city: 'Буэнос-Айрес', users: 87, sessions: 234 },
        { country: 'Мексика', city: 'Мехико', users: 76, sessions: 198 },
        { country: 'США', city: 'Нью-Йорк', users: 54, sessions: 156 },
        { country: 'Чили', city: 'Сантьяго', users: 43, sessions: 123 },
        { country: 'Колумбия', city: 'Богота', users: 38, sessions: 98 },
        { country: 'Перу', city: 'Лима', users: 32, sessions: 87 },
      ];

    case 'devices':
      return {
        devices: [
          { type: 'mobile', count: 1876, percentage: 62.3 },
          { type: 'desktop', count: 896, percentage: 29.8 },
          { type: 'tablet', count: 238, percentage: 7.9 },
        ],
        browsers: [
          { name: 'Chrome', count: 1543, percentage: 51.2 },
          { name: 'Safari', count: 734, percentage: 24.4 },
          { name: 'Firefox', count: 398, percentage: 13.2 },
          { name: 'Edge', count: 234, percentage: 7.8 },
          { name: 'Other', count: 101, percentage: 3.4 },
        ],
      };

    case 'traffic_sources':
      return [
        { source: 'direct', users: 1245, percentage: 41.3 },
        { source: 'organic', users: 987, percentage: 32.8 },
        { source: 'social', users: 456, percentage: 15.1 },
        { source: 'referral', users: 234, percentage: 7.8 },
        { source: 'email', users: 89, percentage: 3.0 },
      ];

    case 'listening_stats':
      return {
        avgListeningTime: 892, // seconds
        completionRate: 67.8, // percentage
        totalPlays: 3421,
        totalCompletions: 2319,
        mostActiveHours: [
          { hour: 8, plays: 287 },
          { hour: 9, plays: 342 },
          { hour: 12, plays: 298 },
          { hour: 13, plays: 265 },
          { hour: 18, plays: 312 },
          { hour: 19, plays: 398 },
          { hour: 20, plays: 423 },
          { hour: 21, plays: 378 },
        ],
      };

    case 'behavior':
      return {
        bounceRate: 32.5,
        avgSessionDuration: 245, // seconds
        pagesPerSession: 3.2,
        interactions: {
          searches: 876,
          filters: 1234,
          shares: 234,
          downloads: 567,
        },
      };

    default:
      return null;
  }
};

/**
 * Generate visitors data for different periods
 */
const generateVisitorsData = (period) => {
  const days = period === '30d' ? 30 : period === '7d' ? 7 : 1;
  const data = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Generate realistic data with weekends having lower traffic
    const baseUsers = isWeekend ? 30 : 50;
    const variability = Math.random() * 20;

    data.push({
      date: date.toISOString().split('T')[0],
      users: Math.round(baseUsers + variability),
      sessions: Math.round((baseUsers + variability) * (2 + Math.random())),
      pageViews: Math.round((baseUsers + variability) * (5 + Math.random() * 3)),
    });
  }

  return data;
};

// ==================== PUBLIC API ====================

/**
 * Get overview statistics
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {boolean} useCache - Use cached data
 */
export const getOverviewStats = async (startDate, endDate, useCache = true) => {
  try {
    // For now, use mock data. Replace with actual API call when backend is ready
    return generateMockData('overview', { startDate, endDate });
    
    // Uncomment when backend is ready:
    // return await fetchData('/overview', { startDate, endDate }, useCache);
  } catch (error) {
    console.error('[GA Data] Failed to fetch overview stats:', error);
    return generateMockData('overview', { startDate, endDate });
  }
};

/**
 * Get visitors data over time
 * @param {string} period - Period ('1d', '7d', '30d')
 * @param {boolean} useCache - Use cached data
 */
export const getVisitorsData = async (period = '7d', useCache = true) => {
  try {
    return generateMockData('visitors', { period });
    // return await fetchData('/visitors', { period }, useCache);
  } catch (error) {
    console.error('[GA Data] Failed to fetch visitors data:', error);
    return generateMockData('visitors', { period });
  }
};

/**
 * Get popular episodes
 * @param {number} limit - Number of episodes to return
 * @param {boolean} useCache - Use cached data
 */
export const getPopularEpisodes = async (limit = 10, useCache = true) => {
  try {
    return generateMockData('popular_episodes');
    // return await fetchData('/popular-episodes', { limit }, useCache);
  } catch (error) {
    console.error('[GA Data] Failed to fetch popular episodes:', error);
    return generateMockData('popular_episodes');
  }
};

/**
 * Get geography data
 * @param {boolean} useCache - Use cached data
 */
export const getGeographyData = async (useCache = true) => {
  try {
    return generateMockData('geography');
    // return await fetchData('/geography', {}, useCache);
  } catch (error) {
    console.error('[GA Data] Failed to fetch geography data:', error);
    return generateMockData('geography');
  }
};

/**
 * Get devices breakdown
 * @param {boolean} useCache - Use cached data
 */
export const getDevicesData = async (useCache = true) => {
  try {
    return generateMockData('devices');
    // return await fetchData('/devices', {}, useCache);
  } catch (error) {
    console.error('[GA Data] Failed to fetch devices data:', error);
    return generateMockData('devices');
  }
};

/**
 * Get traffic sources
 * @param {boolean} useCache - Use cached data
 */
export const getTrafficSources = async (useCache = true) => {
  try {
    return generateMockData('traffic_sources');
    // return await fetchData('/traffic-sources', {}, useCache);
  } catch (error) {
    console.error('[GA Data] Failed to fetch traffic sources:', error);
    return generateMockData('traffic_sources');
  }
};

/**
 * Get listening statistics
 * @param {boolean} useCache - Use cached data
 */
export const getListeningStats = async (useCache = true) => {
  try {
    return generateMockData('listening_stats');
    // return await fetchData('/listening-stats', {}, useCache);
  } catch (error) {
    console.error('[GA Data] Failed to fetch listening stats:', error);
    return generateMockData('listening_stats');
  }
};

/**
 * Get behavior metrics
 * @param {boolean} useCache - Use cached data
 */
export const getBehaviorMetrics = async (useCache = true) => {
  try {
    return generateMockData('behavior');
    // return await fetchData('/behavior', {}, useCache);
  } catch (error) {
    console.error('[GA Data] Failed to fetch behavior metrics:', error);
    return generateMockData('behavior');
  }
};

/**
 * Clear all cached analytics data
 */
export const clearAnalyticsCache = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith('ga_cache_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('[GA Data] Cache cleared');
  } catch (error) {
    console.error('[GA Data] Failed to clear cache:', error);
  }
};

export default {
  getOverviewStats,
  getVisitorsData,
  getPopularEpisodes,
  getGeographyData,
  getDevicesData,
  getTrafficSources,
  getListeningStats,
  getBehaviorMetrics,
  clearAnalyticsCache,
};

