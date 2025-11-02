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

