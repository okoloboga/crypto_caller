import { useEffect } from 'react';
import { useTelegramWebApp } from './useTelegramWebApp';

/**
 * Hook for managing Telegram BackButton
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.onClick - Click handler
 * @param {boolean} options.show - Whether to show the button
 */
export const useBackButton = ({ onClick, show = false }) => {
  const { webApp } = useTelegramWebApp();

  useEffect(() => {
    if (!webApp || !webApp.BackButton) {
      return;
    }

    // Check if BackButton is supported in current version
    // BackButton requires version 6.1+, but some versions may not support it
    try {
      // Try to access version info
      const version = webApp.version || '6.0';
      const versionNumber = parseFloat(version);
      
      // BackButton is supported from version 6.1
      if (versionNumber < 6.1) {
        console.warn(`[Telegram.WebApp] BackButton is not supported in version ${version}`);
        return;
      }
    } catch (error) {
      // If version check fails, try to use BackButton anyway
      console.warn('[Telegram.WebApp] Could not check version for BackButton support');
    }

    const backButton = webApp.BackButton;

    // Show or hide button
    if (show) {
      backButton.show();
    } else {
      backButton.hide();
    }

    // Set up click handler
    const handleClick = () => {
      if (onClick) {
        onClick();
      }
    };

    backButton.onClick(handleClick);

    // Cleanup: remove click handler and hide button
    return () => {
      backButton.offClick(handleClick);
      backButton.hide();
    };
  }, [webApp, show, onClick]);
};

