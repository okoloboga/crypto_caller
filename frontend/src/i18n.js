import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
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