'use client';

import { browserStorage } from '@/lib/browser-storage';

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { type Locale, localizeValue, translateCopy } from '@/lib/i18n';

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (copy: string, values?: Record<string, string | number | undefined>) => string;
  localize: <T,>(value: T) => T;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const storageKey = 'house-rules:locale';
const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

function translateElement(root: Node & { querySelectorAll: ParentNode['querySelectorAll'] }, locale: Locale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    if (node.parentElement?.closest('script, style, textarea, [data-i18n-managed], [translate="no"]')) continue;
    const current = node.nodeValue ?? '';
    if (locale === 'pt-PT' && translateCopy(current, locale) !== current) originalText.set(node, current);
    const next = locale === 'en' ? (originalText.get(node) ?? current) : translateCopy(current, locale);
    if (next !== node.nodeValue) node.nodeValue = next;
  }
  const elements = root instanceof Element ? [root, ...root.querySelectorAll('*')] : [...root.querySelectorAll('*')];
  for (const element of elements) {
    if (element.closest('[data-i18n-managed], [translate="no"]')) continue;
    for (const attribute of ['aria-label', 'placeholder', 'title']) {
      const current = element.getAttribute(attribute);
      if (!current) continue;
      const records = originalAttributes.get(element) ?? new Map<string, string>();
      if (locale === 'pt-PT' && translateCopy(current, locale) !== current) {
        records.set(attribute, current);
        originalAttributes.set(element, records);
      }
      const next = locale === 'en' ? (records.get(attribute) ?? current) : translateCopy(current, locale);
      if (next !== current) element.setAttribute(attribute, next);
    }
  }
}

export default function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('pt-PT');

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedLocale = browserStorage.getItem(storageKey);
      if (savedLocale === 'en' || savedLocale === 'pt-PT') setLocaleState(savedLocale);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    translateElement(document.body, locale);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData' && mutation.target.parentNode) translateElement(mutation.target.parentNode, locale);
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE && node.parentNode) translateElement(node.parentNode, locale);
          else if (node instanceof Element) translateElement(node, locale);
        });
      }
    });
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [locale]);

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale(next) {
      browserStorage.setItem(storageKey, next);
      setLocaleState(next);
    },
    t: (copy, values) => translateCopy(copy, locale, values),
    localize: (entry) => localizeValue(entry, locale),
  }), [locale]);

  return <LanguageContext.Provider value={value}>
    {children}
    <div className="language-switcher" role="group" aria-label="Language">
      <button type="button" className={locale === 'en' ? 'active' : ''} aria-pressed={locale === 'en'} onClick={() => value.setLocale('en')}>EN</button>
      <span aria-hidden="true">/</span>
      <button type="button" className={locale === 'pt-PT' ? 'active' : ''} aria-pressed={locale === 'pt-PT'} onClick={() => value.setLocale('pt-PT')}>PT</button>
    </div>
  </LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
