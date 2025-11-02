import { useCallback } from 'react';
import { telegramAnalytics } from '../index';

/**
 * Hook for tracking Telegram Analytics events
 * 
 * @returns {Object} { trackEvent }
 */
export const useAnalytics = () => {
  const trackEvent = useCallback((eventName, params = {}) => {
    try {
      if (telegramAnalytics && typeof telegramAnalytics.trackEvent === 'function') {
        telegramAnalytics.trackEvent(eventName, params);
        console.log('Analytics event tracked:', eventName, params);
      }
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }, []);

  return { trackEvent };
};

