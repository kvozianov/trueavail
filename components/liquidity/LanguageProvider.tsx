"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  const textOriginals = useRef<WeakMap<Text, string>>(new WeakMap());
  const attributeOriginals = useRef<WeakMap<Element, Map<string, string>>>(new WeakMap());

  useEffect(() => {
    const stored = window.localStorage.getItem("trueavail-language");
    if (stored === "ru" || stored === "en") {
      window.setTimeout(() => setLanguageState(stored), 0);
    }
  }, []);

  useEffect(() => {
    const nextTitle = translateText(language, "TrueAvail — Book cash isn’t usable cash.");
    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
    document.title = nextTitle;
    const titleTimers = [0, 50, 250, 1000].map((delay) =>
      window.setTimeout(() => {
        document.title = nextTitle;
      }, delay),
    );
    const titleObserver = new MutationObserver(() => {
      if (document.title !== nextTitle) {
        document.title = nextTitle;
      }
    });
    titleObserver.observe(document.head, { childList: true, characterData: true, subtree: true });
    window.localStorage.setItem("trueavail-language", language);
    return () => {
      titleTimers.forEach((timer) => window.clearTimeout(timer));
      titleObserver.disconnect();
    };
  }, [language]);

  useEffect(() => {
    const root = document.body;
    const blockedTags = new Set(["CODE", "PRE", "SCRIPT", "STYLE", "TEXTAREA"]);
    const translatedAttributes = ["aria-label", "title", "placeholder", "alt"] as const;
    const hasCyrillic = (value: string) => /[А-Яа-яЁё]/.test(value);

    const translateNodeText = (node: Text) => {
      const parent = node.parentElement;
      if (!parent || blockedTags.has(parent.tagName)) return;

      const value = node.nodeValue ?? "";
      if (!value.trim()) return;

      if (language === "en") {
        const storedOriginal = textOriginals.current.get(node);
        if (storedOriginal && value !== storedOriginal && hasCyrillic(value)) {
          node.nodeValue = storedOriginal;
          return;
        }
        textOriginals.current.set(node, value);
        return;
      }

      let original = textOriginals.current.get(node);
      if (!original || (value !== original && !hasCyrillic(value))) {
        original = value;
      }
      textOriginals.current.set(node, original);
      if (value !== original && hasCyrillic(value)) return;

      const [, leading = "", body = "", trailing = ""] = original.match(/^(\s*)([\s\S]*?)(\s*)$/) ?? [];
      if (!body.trim()) return;

      const next = `${leading}${translateText("ru", body)}${trailing}`;
      if (node.nodeValue !== next) {
        node.nodeValue = next;
      }
    };

    const translateElementAttributes = (element: Element) => {
      if (blockedTags.has(element.tagName)) return;

      translatedAttributes.forEach((attribute) => {
        const value = element.getAttribute(attribute);
        if (!value?.trim()) return;

        let originals = attributeOriginals.current.get(element);
        if (!originals) {
          originals = new Map<string, string>();
          attributeOriginals.current.set(element, originals);
        }

        const original = originals.get(attribute) ?? value;
        originals.set(attribute, original);
        if (language === "ru" && value !== original && hasCyrillic(value)) return;
        const next = language === "ru" ? translateText("ru", original) : original;
        if (value !== next) {
          element.setAttribute(attribute, next);
        }
      });
    };

    const applyTranslation = () => {
      observer.disconnect();
      document.title = translateText(language, "TrueAvail — Book cash isn’t usable cash.");
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let textNode = walker.nextNode();
      while (textNode) {
        translateNodeText(textNode as Text);
        textNode = walker.nextNode();
      }
      root.querySelectorAll("*").forEach(translateElementAttributes);
      observer.observe(root, {
        attributes: true,
        attributeFilter: [...translatedAttributes],
        childList: true,
        characterData: true,
        subtree: true,
      });
    };

    let frame = 0;
    const scheduleTranslation = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(applyTranslation);
    };

    const observer = new MutationObserver(scheduleTranslation);
    applyTranslation();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
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
