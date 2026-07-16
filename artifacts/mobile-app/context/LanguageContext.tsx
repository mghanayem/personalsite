import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'en' | 'ar';

interface LanguageContextValue {
  lang: Language;
  toggleLanguage: () => void;
  t: (ar?: string, en?: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  toggleLanguage: () => {},
  t: (_ar, en) => en ?? '',
  isRTL: false,
});

const STORAGE_KEY = 'app_language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'ar' || stored === 'en') {
        setLang(stored);
      }
    });
  }, []);

  const toggleLanguage = () => {
    setLang((prev) => {
      const next: Language = prev === 'en' ? 'ar' : 'en';
      AsyncStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  const t = (ar?: string, en?: string): string =>
    lang === 'ar' ? (ar ?? '') : (en ?? '');

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t, isRTL: lang === 'ar' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
