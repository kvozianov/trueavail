"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  languageLabels,
  localizeMessage,
  translateText,
  type Language,
  type LocalizedMessage,
} from "@/lib/i18n";

type LanguageContextValue = {
  language: Language;
  languageLabels: Record<Language, string>;
  setLanguage: (language: Language) => void;
  t: (english: string, russian?: string) => string;
  translate: (value: string) => string;
  message: (value: LocalizedMessage) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem("trueavail-language");
    if (stored === "ru" || stored === "en") {
      window.setTimeout(() => setLanguageState(stored), 0);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("trueavail-language", language);
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      languageLabels,
      setLanguage: setLanguageState,
      t: (english, russian) => (language === "ru" ? russian ?? translateText("ru", english) : english),
      translate: (text) => translateText(language, text),
      message: (message) => localizeMessage(language, message),
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return value;
}
