import { useEffect, useRef } from 'react';
import { useTelegramWebApp } from './useTelegramWebApp';

/**
 * Hook for managing Telegram MainButton
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.text - Button text
 * @param {Function} options.onClick - Click handler
 * @param {boolean} options.show - Whether to show the button
 * @param {boolean} options.progress - Whether to show progress indicator
 * @param {string} options.color - Button color (optional)
 * @param {string} options.textColor - Button text color (optional)
 */
export const useMainButton = ({ text, onClick, show = true, progress = false, color, textColor }) => {
  const { webApp } = useTelegramWebApp();
  const onClickRef = useRef(onClick);

  // Keep onClick ref up to date
  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    if (!webApp || !webApp.MainButton) {
      return;
    }

    const mainButton = webApp.MainButton;

    // Set button text
    if (text !== undefined) {
      mainButton.setText(text);
    }

    // Set button colors if provided
    if (color) {
      mainButton.color = color;
    }
    if (textColor) {
      mainButton.textColor = textColor;
    }

    // Show or hide button
    if (show) {
      mainButton.show();
    } else {
      mainButton.hide();
    }

    // Show or hide progress indicator
    if (progress) {
      mainButton.showProgress();
    } else {
      mainButton.hideProgress();
    }

    // Set up click handler
    const handleClick = () => {
      if (onClickRef.current) {
        onClickRef.current();
      }
    };

    mainButton.onClick(handleClick);

    // Cleanup: remove click handler and hide button
    return () => {
      mainButton.offClick(handleClick);
      mainButton.hide();
      mainButton.hideProgress();
    };
  }, [webApp, text, show, progress, color, textColor]);
};

