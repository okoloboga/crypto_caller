import React, { createContext, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();
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