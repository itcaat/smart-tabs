import { useState, useEffect, useCallback } from 'react';
import { translations } from './translations';

const SUPPORTED_LANGUAGES = ['en', 'ru', 'fr', 'de', 'es', 'it'];
const DEFAULT_LANGUAGE = 'en';
const STORAGE_KEY = 'smarttabs_language';

function detectBrowserLanguage() {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  
  // Get browser language
  const browserLang = navigator.language || navigator.userLanguage || '';
  const langCode = browserLang.split('-')[0].toLowerCase();
  
  // Check if supported
  if (SUPPORTED_LANGUAGES.includes(langCode)) {
    return langCode;
  }
  
  return DEFAULT_LANGUAGE;
}

export function useTranslation() {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check for saved preference
    const savedLang = localStorage.getItem(STORAGE_KEY);
    if (savedLang && SUPPORTED_LANGUAGES.includes(savedLang)) {
      setLanguage(savedLang);
    } else {
      // Auto-detect
      const detected = detectBrowserLanguage();
      setLanguage(detected);
    }
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
    
    // Replace {param} placeholders
    if (typeof text === 'string') {
      return text.replace(/\{(\w+)\}/g, (match, paramName) => {
        return params[paramName] !== undefined ? params[paramName] : match;
      });
    }
    
    return text;
  }, [language]);
  
  return {
    t,
    language,
    changeLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
