import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/Header';
import GlobalPlayer from '@/components/GlobalPlayer';
import Footer from '@/components/Footer';
import LanguageSelectionModal from '@/components/LanguageSelectionModal';
import { TelegramProvider } from '@/contexts/TelegramContext';
import { getLocaleString } from '@/lib/locales';
import InstantEpisodesPage from '@/pages/InstantEpisodesPage';
import PlayerPage from '@/pages/PlayerPage';
import NotFoundPage from '@/pages/NotFoundPage';
import DeepSearchPage from '@/pages/DeepSearchPage';
import OfflineSettingsPage from '@/pages/OfflineSettingsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import GenericPage from '@/pages/GenericPage';
import AboutPage from '@/pages/AboutPage';
import FestivalPage from '@/pages/FestivalPage';
import EventsPage from '@/pages/EventsPage';
import VolunteersPage from '@/pages/VolunteersPage';
import { supabase } from '@/lib/supabaseClient.js';
import { TooltipProvider } from '@/components/ui/tooltip';
import cacheIntegration from '@/lib/cacheIntegration';
import { useToast } from '@/components/ui/use-toast';
import { EditorAuthProvider, useEditorAuth } from '@/contexts/EditorAuthContext';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { EditorAuthModal } from '@/components/EditorAuthModal';
import EditHistoryAdminPage from '@/pages/EditHistoryAdminPage';
import LivePage from '@/pages/LivePage';
import ArticlesPage from '@/pages/ArticlesPage';
import ArticleDetailPage from '@/pages/ArticleDetailPage';
import { initGA4, trackPageView } from '@/lib/analyticsService';
import PlayerDiagnostics from '@/components/debug/PlayerDiagnostics';

// Поддерживаемые языки
const SUPPORTED_LANGUAGES = ['ru', 'es', 'en', 'de', 'fr', 'pl'];

// Компонент для редиректа старых URL без языкового префикса
const LanguageRedirect = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Получаем язык из localStorage или используем дефолтный
    const savedLang = localStorage.getItem('podcastLang') || 'ru';
    const path = location.pathname;
    
    console.log('[LanguageRedirect] Current path:', path);
    console.log('[LanguageRedirect] Saved language:', savedLang);
    
    // Если путь уже начинается с языкового префикса, ничего не делаем
    if (SUPPORTED_LANGUAGES.some(lang => path.startsWith(`/${lang}/`))) {
      console.log('[LanguageRedirect] Path already has valid language prefix, no redirect');
      return;
    }
    
    // Редиректим на путь с языковым префиксом
    const newPath = path === '/' ? `/${savedLang}/episodes` : `/${savedLang}${path}`;
    console.log('[LanguageRedirect] Redirecting to:', newPath);
    navigate(newPath, { replace: true });
  }, [location, navigate]);
  
  return null;
};

// Route tracking component
const RouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const pageTitle = document.title;
    trackPageView(location.pathname, pageTitle);
  }, [location]);

  return null;
};

// Компонент для редиректа старых URL эпизодов
const OldEpisodeRedirect = () => {
  const { episodeSlug } = useParams();
  const location = useLocation();
  const savedLang = localStorage.getItem('podcastLang') || 'ru';
  
  return <Navigate to={`/${savedLang}/${episodeSlug}${location.search}${location.hash}`} replace />;
};

// Компонент для редиректа старых URL эпизодов с языком (/ru/episode/slug -> /ru/slug)
const LegacyEpisodeRedirect = () => {
  const { lang, episodeSlug } = useParams();
  const location = useLocation();
  return <Navigate to={`/${lang}/${episodeSlug}${location.search}${location.hash}`} replace />;
};

// Wrapper для получения языка из URL
const LanguageRouteWrapper = ({ children }) => {
  const { lang } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  console.log('[LanguageRouteWrapper] Current lang param:', lang);
  
  // Проверяем, что язык валидный
  const validLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : 'ru';
  
  // Если язык невалидный, редиректим
  useEffect(() => {
    if (lang && !SUPPORTED_LANGUAGES.includes(lang)) {
      const pathWithoutLang = location.pathname.replace(/^\/[^/]+/, '') || '/episodes';
      console.log('[LanguageRouteWrapper] Invalid lang, redirecting to:', `/ru${pathWithoutLang}`);
      navigate(`/ru${pathWithoutLang}`, { replace: true });
    }
  }, [lang, location, navigate]);
  
  // Сохраняем язык в localStorage - только при первом рендере
  useEffect(() => {
    if (validLang) {
      const currentStoredLang = localStorage.getItem('podcastLang');
      if (currentStoredLang !== validLang) {
        console.log('[LanguageRouteWrapper] Saving valid lang to localStorage:', validLang);
        localStorage.setItem('podcastLang', validLang);
      }
    }
  }, [validLang]);
  
  // Просто рендерим дочерние элементы вместо клонирования
  return <>{children}</>;
};

const AppLayout = ({ user }) => {
  const location = useLocation();
  const { showAuthModal, closeAuthModal } = useEditorAuth();
  const showDebug = new URLSearchParams(location.search).get('debug') === 'true';
  
  // Determine language from URL
  const pathParts = location.pathname.split('/');
  const langCandidate = pathParts[1];
  const currentLanguage = SUPPORTED_LANGUAGES.includes(langCandidate) ? langCandidate : 'ru';

  const podcastData = {
    title: 'Dos Mundos',
    author: 'EL CENTRO DESARROLLO INTEGRAL',
    image: '/img/logo-5-120x120.png'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex flex-col">
      {showDebug && <PlayerDiagnostics />}
      <LanguageRedirect />
      <RouteTracker />
      
      <Header podcastData={podcastData} currentLanguage={currentLanguage} />

      <main className="flex-grow w-full">
        {/* Global player sits below the fixed header */}
        <GlobalPlayer currentLanguage={currentLanguage} />
        <Routes>
          {/* Редирект корня на дефолтный язык */}
          <Route path="/" element={<Navigate to="/ru/episodes" replace />} />
          
          {/* Старые маршруты без языкового префикса - редиректим */}
          <Route path="/episodes" element={<Navigate to="/ru/episodes" replace />} />
          <Route path="/deep-search" element={<Navigate to="/ru/deep-search" replace />} />
          <Route path="/edit" element={<Navigate to="/ru/edit" replace />} />
          <Route path="/analytics" element={<Navigate to="/ru/analytics" replace />} />
          <Route path="/offline-settings" element={<Navigate to="/ru/offline-settings" replace />} />
          <Route path="/about" element={<Navigate to="/ru/about" replace />} />
          <Route path="/festival" element={<Navigate to="/ru/festival" replace />} />
          <Route path="/volunteers" element={<Navigate to="/ru/volunteers" replace />} />
          
          {/* Старые маршруты эпизодов - специальная обработка */}
          <Route path="/episode/:episodeSlug" element={
            <OldEpisodeRedirect />
          } />
          
          {/* Новые маршруты с языковым префиксом */}
          <Route path="/:lang" element={<Navigate to="episodes" replace />} />
          <Route path="/:lang/live" element={
            <LanguageRouteWrapper>
              <LivePage />
            </LanguageRouteWrapper>
          } />
          <Route path="/:lang/about" element={
            <LanguageRouteWrapper>
              <AboutPage />
            </LanguageRouteWrapper>
          } />
          <Route path="/:lang/festival" element={
            <LanguageRouteWrapper>
              <FestivalPage />
            </LanguageRouteWrapper>
          } />
          <Route path="/:lang/events" element={
            <LanguageRouteWrapper>
              <EventsPage />
            </LanguageRouteWrapper>
          } />
          <Route path="/:lang/volunteers" element={
            <LanguageRouteWrapper>
              <VolunteersPage />
            </LanguageRouteWrapper>
          } />
           <Route path="/:lang/episodes" element={
             <LanguageRouteWrapper>
               <InstantEpisodesPage currentLanguage={currentLanguage} />
             </LanguageRouteWrapper>
           } />
          <Route path="/:lang/episode/:episodeSlug" element={
            <LegacyEpisodeRedirect />
          } />
           <Route path="/:lang/deep-search" element={
             <DeepSearchPage />
           } />
          <Route path="/:lang/edit" element={
            <LanguageRouteWrapper>
              <EditHistoryAdminPage />
            </LanguageRouteWrapper>
          } />
          <Route path="/:lang/analytics" element={
            <AnalyticsPage />
          } />
          <Route path="/:lang/offline-settings" element={
            <LanguageRouteWrapper>
              <OfflineSettingsPage onBack={() => window.history.back()} />
            </LanguageRouteWrapper>
          } />

          {/* Articles routes - need to be placed before catch-all episode route */}
          <Route path="/:lang/articles" element={
            <LanguageRouteWrapper>
              <ArticlesPage />
            </LanguageRouteWrapper>
          } />
          <Route path="/:lang/articles/:articleId" element={
            <LanguageRouteWrapper>
              <ArticleDetailPage />
            </LanguageRouteWrapper>
          } />
          
          {/* Short URL for episodes: /lang/slug */}
          <Route path="/:lang/:episodeSlug" element={
            <LanguageRouteWrapper>
              <PlayerPage user={user} />
            </LanguageRouteWrapper>
          } />

          <Route path="*" element={
            <LanguageRouteWrapper>
              <NotFoundPage />
            </LanguageRouteWrapper>
          } />
        </Routes>
      </main>
      
      <Footer 
        currentLanguage={currentLanguage}
      />
      
      {/* Global Auth Modal */}
      <EditorAuthModal 
        isOpen={showAuthModal}
        onClose={closeAuthModal}
        currentLanguage={currentLanguage}
      />
      
      <Toaster />
    </div>
  );
};

// Internal component that has access to EditorAuthContext
const AppContent = ({ user }) => {
  return (
    <TooltipProvider>
      <Router>
        <AppLayout user={user} />
      </Router>
    </TooltipProvider>
  );
};


function App() {
  const [showLangModal, setShowLangModal] = useState(() => {
    // Если язык уже сохранен, не показываем модалку
    if (localStorage.getItem('podcastLang')) {
      return false;
    }

    // Если в URL уже есть язык, не показываем модалку
    const path = window.location.pathname;
    const hasLangInUrl = SUPPORTED_LANGUAGES.some(lang => 
      path.startsWith(`/${lang}/`) || path === `/${lang}`
    );
    
    if (hasLangInUrl) {
      return false;
    }

    return true;
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [offlineServicesReady, setOfflineServicesReady] = useState(false);
  const { toast } = useToast();
  const savedLang = localStorage.getItem('podcastLang') || 'ru';

  // Инициализация Google Analytics
  useEffect(() => {
    initGA4();
  }, []);

  // Инициализация оптимизированной системы кэша и регулярной очистки temp файлов
  useEffect(() => {
    const initOptimizedCache = async () => {
      try {
        console.log('[App] Initializing optimized cache system...');

        // Инициализируем оптимизированную систему кэша
        await cacheIntegration.init();

        setOfflineServicesReady(true);
        console.log('[App] Optimized cache system initialized successfully');
      } catch (error) {
        console.error('[App] Failed to initialize optimized cache:', error);
        setOfflineServicesReady(true);
      }
    };

    initOptimizedCache();
  }, [savedLang, toast]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setAuthLoading(false);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLanguageSelect = useCallback((lang) => {
    localStorage.setItem('podcastLang', lang);
    setShowLangModal(false);
    // Редиректим на текущий путь с новым языком
    const currentPath = window.location.pathname;
    const pathWithoutLang = currentPath.replace(/^\/(ru|es|en|de|fr|pl)/, '') || '/episodes';
    window.location.href = `/${lang}${pathWithoutLang}`;
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center">
        <p>{getLocaleString('loading', savedLang)}</p>
      </div>
    );
  }

  if (showLangModal) {
    return (
      <TelegramProvider>
         <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex flex-col">
            <LanguageSelectionModal onLanguageSelect={handleLanguageSelect} currentLanguage={savedLang} />
            <Toaster />
          </div>
      </TelegramProvider>
    );
  }

  return (
    <TelegramProvider>
      <EditorAuthProvider>
        <PlayerProvider>
          <AppContent user={user} />
        </PlayerProvider>
      </EditorAuthProvider>
    </TelegramProvider>
  );
}

export default App;
