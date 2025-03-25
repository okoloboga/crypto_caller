/**
 * Language context module for the RUBLE Farming App.
 * This module provides a React context for managing the app's language state and changing the language.
 * It integrates with i18next for internationalization, allowing components to access and update the current language.
 */

import React, { createContext, useContext, useState } from 'react';

// Import the useTranslation hook from react-i18next for language management
import { useTranslation } from 'react-i18next';

// Create a LanguageContext to store and provide language-related data
const LanguageContext = createContext();

/**
 * LanguageProvider component that wraps the app to provide language context.
 * It manages the current language state and provides a function to change the language.
 * @param {Object} props - The component props.
 * @param {React.ReactNode} props.children - The child components to render within the provider.
 * @returns {JSX.Element} The LanguageContext provider wrapping the children.
 */
export const LanguageProvider = ({ children }) => {
  // Access the i18n instance for language management
  const { i18n } = useTranslation();

  // State to store the current language, initialized with the i18n language
  const [language, setLanguage] = useState(i18n.language);

  /**
   * Change the app's language.
   * Updates the local state and the i18n language.
   * @param {string} lang - The new language code (e.g., 'en', 'ru').
   */
  const changeLanguage = (lang) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  // Provide the language state and changeLanguage function to child components
  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * Custom hook to access the LanguageContext.
 * Provides the current language and the function to change it.
 * @returns {Object} The language context value, containing the current language and changeLanguage function.
 */
export const useLanguage = () => {
  return useContext(LanguageContext);
};