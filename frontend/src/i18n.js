/**
 * Internationalization (i18n) configuration for the RUBLE Farming App.
 * This file sets up i18next for multi-language support, enabling the app to load translations
 * dynamically from JSON files and integrate with React components.
 */

// Import the core i18next library for internationalization
import i18n from 'i18next';

// Import the React i18next adapter to integrate i18next with React
import { initReactI18next } from 'react-i18next';

// Import the HTTP backend for i18next to load translation files dynamically
import i18nextHttpBackend from 'i18next-http-backend';

// Initialize i18next with the necessary plugins and configuration
i18n
  // Use the HTTP backend to load translation files from the server
  .use(i18nextHttpBackend)
  // Use the React i18next adapter to enable hooks and components for translations
  .use(initReactI18next)
  // Initialize i18next with the configuration options
  .init({
    // Set the default language to English
    lng: 'en',
    // Fallback language to use if the requested language is unavailable
    fallbackLng: 'en',
    // Backend configuration for loading translation files
    backend: {
      // Path to translation files, where {{lng}} is the language (e.g., 'en') and {{ns}} is the namespace
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    // Interpolation settings for handling dynamic values in translations
    interpolation: {
      // Disable escaping of values (React handles this automatically)
      escapeValue: false,
    },
  });

// Export the configured i18n instance for use in the app
export default i18n;