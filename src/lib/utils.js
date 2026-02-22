import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const formatTime = (seconds, showHours = false) => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (showHours || hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const formatFullTime = (seconds, showHours = false) => {
  return formatTime(seconds, showHours);
};

export function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') return '';
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
}

export const getFileNameWithoutExtension = (filename) => {
  return filename.replace(/\.[^/.]+$/, '');
};

export const formatShortDate = (dateString, language = 'ru') => {
  if (!dateString) return '';

  // Если дата уже в формате DD.MM.YY, возвращаем как есть
  if (typeof dateString === 'string' && /^\d{2}\.\d{2}\.\d{2}$/.test(dateString)) {
    return dateString;
  }

  try {
    // Для формата YYYY-MM-DD, парсим напрямую без временной зоны
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
      return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${String(year).slice(-2)}`;
    }

    // Для других форматов используем локальную дату
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${String(year).slice(-2)}`;
  } catch (error) {
    console.warn('Invalid date string format:', dateString);
    return dateString;
  }
};

// Функция для расчета времени чтения статьи
// Средняя скорость чтения: 200 слов/мин для русского, 250 слов/мин для английского
export const calculateReadingTime = (htmlContent, lang = 'ru') => {
  if (!htmlContent) return 1;
  
  // Remove HTML tags
  const textContent = htmlContent.replace(/<[^>]+>/g, ' ');
  
  // Count words (split by whitespace and filter empty strings)
  const words = textContent.trim().split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  
  // Words per minute based on language
  const wordsPerMinute = lang === 'ru' ? 200 : 250;
  
  // Calculate reading time in minutes, round up
  const readingTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  
  return readingTime;
};

// Функция для форматирования даты статьи в зависимости от языка
export const formatArticleDate = (dateString, lang = 'ru') => {
  if (!dateString) return '';
  
  try {
    let date;
    
    // Для формата YYYY-MM-DD парсим без timezone смещения
    // чтобы не сдвигать дату на предыдущий день в западных часовых поясах
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day); // local timezone, no UTC shift
    } else if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(dateString)) {
      // ISO datetime — parse and use as-is
      date = new Date(dateString);
    } else {
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) return '';
    
    // Locale mapping
    const localeMap = {
      'ru': 'ru-RU',
      'es': 'es-ES',
      'en': 'en-US',
      'de': 'de-DE',
      'fr': 'fr-FR',
      'pl': 'pl-PL'
    };
    
    const locale = localeMap[lang] || 'ru-RU';
    
    // Format: "15 декабря 2024" or "December 15, 2024"
    return new Intl.DateTimeFormat(locale, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(date);
  } catch (error) {
    console.warn('Invalid date format:', dateString);
    return '';
  }
};

// Функция для преобразования аудио URL через прокси (для обхода CORS)
export const getProxiedAudioUrl = (originalUrl) => originalUrl;

// Функция для проверки доступности прокси
export const testProxyAvailability = async () => true;

// Функция для получения URL с fallback
export const getAudioUrlWithFallback = async (originalUrl) => originalUrl;
