import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from './translations';

const SUPPORTED_LANGUAGES = ['en', 'ru', 'fr', 'de', 'es', 'it'];
const DEFAULT_LANGUAGE = 'en';
const STORAGE_KEY = 'smarttabs_language';

function detectBrowserLanguage() {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  
  const browserLang = navigator.language || navigator.userLanguage || '';
  const langCode = browserLang.split('-')[0].toLowerCase();
  
  if (SUPPORTED_LANGUAGES.includes(langCode)) {
    return langCode;
  }
  
  return DEFAULT_LANGUAGE;
}

const TranslationContext = createContext(null);

export function TranslationProvider({ children }) {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const savedLang = localStorage.getItem(STORAGE_KEY);
    if (savedLang && SUPPORTED_LANGUAGES.includes(savedLang)) {
      setLanguage(savedLang);
    } else {
      const detected = detectBrowserLanguage();
      setLanguage(detected);
    }
    setIsInitialized(true);
  }, []);
  
  const changeLanguage = useCallback((lang) => {
    if (SUPPORTED_LANGUAGES.includes(lang)) {
      setLanguage(lang);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, lang);
      }
    }
  }, []);
  
  const t = useCallback((key, params = {}) => {
    const text = translations[language]?.[key] || translations[DEFAULT_LANGUAGE]?.[key] || key;
    
    if (typeof text === 'string') {
      return text.replace(/\{(\w+)\}/g, (match, paramName) => {
        return params[paramName] !== undefined ? params[paramName] : match;
      });
    }
    
    return text;
  }, [language]);
  
  const value = {
    t,
    language,
    changeLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
    isInitialized,
  };
  
  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
