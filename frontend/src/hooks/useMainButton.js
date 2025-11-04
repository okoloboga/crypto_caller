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

    // Validate text - it must not be empty if we want to show the button
    const hasValidText = text && text.trim().length > 0;
    const shouldShow = show && hasValidText;

    // Only set text if it's valid and not empty
    if (hasValidText) {
      mainButton.setText(text);
    }

    // Set button colors if provided
    if (color) {
      mainButton.color = color;
    }
    if (textColor) {
      mainButton.textColor = textColor;
    }

    // Show or hide button only if we have valid text
    if (shouldShow) {
      mainButton.show();
    } else {
      mainButton.hide();
    }

    // Show or hide progress indicator
    if (progress && shouldShow) {
      mainButton.showProgress();
    } else {
      mainButton.hideProgress();
    }

    // Set up click handler only if we have valid text
    if (shouldShow && onClickRef.current) {
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
    } else {
      // Cleanup: just hide button if no valid text
      return () => {
        mainButton.hide();
        mainButton.hideProgress();
      };
    }
  }, [webApp, text, show, progress, color, textColor]);
};

