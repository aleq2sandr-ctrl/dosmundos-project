import { useNavigate, useParams, useLocation } from 'react-router-dom';

/**
 * Хук для навигации с поддержкой языкового префикса в URL
 * @param {string} currentLanguage - текущий язык
 * @returns {object} - объект с функциями навигации
 */
export const useLanguageNavigation = (currentLanguage) => {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  
  // Получаем язык из URL или используем текущий
  const lang = params.lang || currentLanguage || 'ru';
  
  /**
   * Создает путь с языковым префиксом
   * @param {string} path - путь без языкового префикса (например, "/episodes")
   * @returns {string} - путь с языковым префиксом (например, "/ru/episodes")
   */
  const getLocalizedPath = (path) => {
    // Убираем начальный слеш если есть
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    // Убираем языковой префикс если он уже есть
    const pathWithoutLang = cleanPath.match(/^(ru|es|en|de|fr|pl)\//) 
      ? cleanPath.replace(/^(ru|es|en|de|fr|pl)\//, '')
      : cleanPath;
    return `/${lang}/${pathWithoutLang}`;
  };
  
  /**
   * Навигация с языковым префиксом
   * @param {string} path - путь без языкового префикса
   * @param {object} options - опции для navigate
   */
  const navigateTo = (path, options = {}) => {
    const localizedPath = getLocalizedPath(path);
    navigate(localizedPath, options);
  };
  
  /**
   * Получить текущий язык из URL
   * @returns {string} - код языка
   */
  const getLanguageFromUrl = () => {
    return params.lang || currentLanguage || 'ru';
  };
  
  /**
   * Изменить язык в URL
   * @param {string} newLang - новый язык
   */
  const changeLanguage = (newLang) => {
    const currentPath = location.pathname;
    // Убираем текущий языковой префикс если есть
    const pathWithoutLang = currentPath.replace(/^\/(ru|es|en|de|fr|pl)/, '') || '/';
    // Создаем новый путь с новым языком
    const newPath = pathWithoutLang === '/' ? `/${newLang}/episodes` : `/${newLang}${pathWithoutLang}`;
    navigate(newPath, { replace: true });
  };
  
  return {
    navigateTo,
    getLocalizedPath,
    getLanguageFromUrl,
    changeLanguage,
    currentLang: lang,
  };
};

export default useLanguageNavigation;

