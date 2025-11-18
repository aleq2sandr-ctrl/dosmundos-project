
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Footer from '@/components/Footer';
import LanguageSelectionModal from '@/components/LanguageSelectionModal';
import { TelegramProvider } from '@/contexts/TelegramContext';
import { getLocaleString } from '@/lib/locales';
import InstantEpisodesPage from '@/pages/InstantEpisodesPage';
import PlayerPage from '@/pages/PlayerPage';
import ManagePage from '@/pages/ManageEpisodesPage';
import UploadPage from '@/pages/UploadPage';
import NotFoundPage from '@/pages/NotFoundPage';
import DeepSearchPage from '@/pages/DeepSearchPage';
import OfflineSettingsPage from '@/pages/OfflineSettingsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import { supabase } from '@/lib/supabaseClient';
import { TooltipProvider } from '@/components/ui/tooltip';
import cacheIntegration from '@/lib/cacheIntegration';
import { useToast } from '@/components/ui/use-toast';
import { EditorAuthProvider, useEditorAuth } from '@/contexts/EditorAuthContext';
import { EditorAuthModal } from '@/components/EditorAuthModal';
import EditHistoryAdminPage from '@/pages/EditHistoryAdminPage';
import { initGA4, trackPageView } from '@/lib/analyticsService';

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
    
    // Если путь уже начинается с языкового префикса, ничего не делаем
    if (SUPPORTED_LANGUAGES.some(lang => path.startsWith(`/${lang}/`))) {
      return;
    }
    
    // Редиректим на путь с языковым префиксом
    const newPath = path === '/' ? `/${savedLang}/episodes` : `/${savedLang}${path}`;
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
  const savedLang = localStorage.getItem('podcastLang') || 'ru';
  
  return <Navigate to={`/${savedLang}/episode/${episodeSlug}`} replace />;
};

// Wrapper для получения языка из URL
const LanguageRouteWrapper = ({ children }) => {
  const { lang } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Проверяем, что язык валидный
  const validLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : 'ru';
  
  // Если язык невалидный, редиректим
  useEffect(() => {
    if (lang && !SUPPORTED_LANGUAGES.includes(lang)) {
      const pathWithoutLang = location.pathname.replace(/^\/[^/]+/, '') || '/episodes';
      navigate(`/ru${pathWithoutLang}`, { replace: true });
    }
  }, [lang, location, navigate]);
  
  // Сохраняем язык в localStorage
  useEffect(() => {
    if (validLang) {
      localStorage.setItem('podcastLang', validLang);
    }
  }, [validLang]);
  
  return React.cloneElement(children, { currentLanguage: validLang });
};

// Internal component that has access to EditorAuthContext
const AppContent = ({ user }) => {
  const { showAuthModal, closeAuthModal } = useEditorAuth();
  const { lang } = useParams();
  const currentLanguage = SUPPORTED_LANGUAGES.includes(lang) ? lang : 'ru';

  return (
    <TooltipProvider>
      <Router>
        <LanguageRedirect />
        <RouteTracker />
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex flex-col">
          <main className="flex-grow w-full">
            <Routes>
              {/* Редирект корня на дефолтный язык */}
              <Route path="/" element={<Navigate to="/ru/episodes" replace />} />
              
              {/* Старые маршруты без языкового префикса - редиректим */}
              <Route path="/episodes" element={<Navigate to="/ru/episodes" replace />} />
              <Route path="/manage" element={<Navigate to="/ru/manage" replace />} />
              <Route path="/upload" element={<Navigate to="/ru/upload" replace />} />
              <Route path="/deep-search" element={<Navigate to="/ru/deep-search" replace />} />
              <Route path="/edit" element={<Navigate to="/ru/edit" replace />} />
              <Route path="/analytics" element={<Navigate to="/ru/analytics" replace />} />
              <Route path="/offline-settings" element={<Navigate to="/ru/offline-settings" replace />} />
              
              {/* Старые маршруты эпизодов - специальная обработка */}
              <Route path="/episode/:episodeSlug" element={
                <OldEpisodeRedirect />
              } />
              
              {/* Новые маршруты с языковым префиксом */}
              <Route path="/:lang/episodes" element={
                <LanguageRouteWrapper>
                  <InstantEpisodesPage />
                </LanguageRouteWrapper>
              } />
              <Route path="/:lang/episode/:episodeSlug" element={
                <LanguageRouteWrapper>
                  <PlayerPage user={user} />
                </LanguageRouteWrapper>
              } />
              <Route path="/:lang/manage" element={
                <LanguageRouteWrapper>
                  <ManagePage />
                </LanguageRouteWrapper>
              } />
              <Route path="/:lang/upload" element={
                <LanguageRouteWrapper>
                  <UploadPage />
                </LanguageRouteWrapper>
              } />
              <Route path="/:lang/deep-search" element={
                <LanguageRouteWrapper>
                  <DeepSearchPage />
                </LanguageRouteWrapper>
              } />
              <Route path="/:lang/edit" element={
                <LanguageRouteWrapper>
                  <EditHistoryAdminPage />
                </LanguageRouteWrapper>
              } />
              <Route path="/:lang/analytics" element={
                <LanguageRouteWrapper>
                  <AnalyticsPage />
                </LanguageRouteWrapper>
              } />
              <Route path="/:lang/offline-settings" element={
                <LanguageRouteWrapper>
                  <OfflineSettingsPage onBack={() => window.history.back()} />
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
      </Router>
    </TooltipProvider>
  );
};


function App() {
  const [showLangModal, setShowLangModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [offlineServicesReady, setOfflineServicesReady] = useState(false);
  const { toast } = useToast();
  const savedLang = localStorage.getItem('podcastLang') || 'ru';

  // Инициализация Google Analytics
  useEffect(() => {
    initGA4();
  }, []);

  // Инициализация оптимизированной системы кэша
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
        <AppContent user={user} />
      </EditorAuthProvider>
    </TelegramProvider>
  );
}

export default App;
