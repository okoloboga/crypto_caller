import { useEffect, useState, useCallback } from 'react';

/**
 * Hook for Telegram WebApp API integration
 * Initializes WebApp, handles viewport and safe area insets
 * 
 * @returns {Object} { webApp, ready, viewportHeight, safeAreaInsets }
 */
export const useTelegramWebApp = () => {
  const [webApp, setWebApp] = useState(null);
  const [ready, setReady] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(null);
  const [safeAreaInsets, setSafeAreaInsets] = useState({ top: 0, bottom: 0 });

  useEffect(() => {
    // Check if Telegram WebApp API is available
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      
      try {
        // Initialize WebApp
        tg.ready();
        tg.expand(); // Expand to full screen
        
        // Get initial viewport height
        if (tg.viewportHeight) {
          setViewportHeight(tg.viewportHeight);
          // Set CSS variable for viewport height
          document.documentElement.style.setProperty(
            '--tg-viewport-height',
            `${tg.viewportHeight}px`
          );
        }

        // Get safe area insets
        if (tg.safeAreaInsets) {
          const insets = {
            top: tg.safeAreaInsets.top || 0,
            bottom: tg.safeAreaInsets.bottom || 0,
          };
          setSafeAreaInsets(insets);
          
          // Set CSS variables for safe area
          document.documentElement.style.setProperty(
            '--tg-safe-area-top',
            `${insets.top}px`
          );
          document.documentElement.style.setProperty(
            '--tg-safe-area-bottom',
            `${insets.bottom}px`
          );
        }

        setWebApp(tg);
        setReady(true);

        // Handle viewport changes
        const handleViewportChange = () => {
          if (tg.viewportHeight) {
            setViewportHeight(tg.viewportHeight);
            document.documentElement.style.setProperty(
              '--tg-viewport-height',
              `${tg.viewportHeight}px`
            );
          }
        };

        // Subscribe to viewport changes
        tg.onEvent('viewportChanged', handleViewportChange);

        // Cleanup: unsubscribe from events
        return () => {
          tg.offEvent('viewportChanged', handleViewportChange);
        };
      } catch (error) {
        console.error('Error initializing Telegram WebApp:', error);
        // Fallback: continue without WebApp API
        setReady(true);
      }
    } else {
      // Not running in Telegram - fallback mode
      console.log('Telegram WebApp API not available - running in fallback mode');
      setReady(true);
    }
  }, []);

  return {
    webApp,
    ready,
    viewportHeight,
    safeAreaInsets,
  };
};

