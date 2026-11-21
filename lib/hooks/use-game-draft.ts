'use client';

import { useEffect, useState } from 'react';
import { browserStorage } from '@/lib/browser-storage';

// Only the player's own unfinished input is saved, never revealed role cards.
// A single slot per field replaces the previous round rather than accumulating secrets.
export function useGameDraft<T>(owner: string, scope: string, field: string, initial: T) {
  const key = `house-rules-draft:${owner}:${field}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = JSON.parse(browserStorage.getItem(key) ?? 'null');
      if (saved?.scope === scope && saved.expires > Date.now() && saved.value !== undefined && compatible(saved.value, initial)) return saved.value as T;
    } catch { /* A damaged draft must not prevent play. */ }
    return initial;
  });
  useEffect(() => {
    browserStorage.setItem(key, JSON.stringify({ scope, value, expires: Date.now() + 12 * 60 * 60 * 1000 }));
  }, [key, scope, value]);
  return [value, setValue] as const;
}

function compatible(value: unknown, initial: unknown): boolean {
  if (initial === null) return value === null || typeof value === 'number';
  if (Array.isArray(initial)) return Array.isArray(value) && (initial.length === 0 || (value.length === initial.length && value.every((entry, i) => compatible(entry, initial[i]))));
  if (typeof initial === 'object') return Boolean(value) && typeof value === 'object' && Object.entries(initial as object).every(([key, entry]) => compatible((value as Record<string, unknown>)[key], entry));
  return typeof value === typeof initial;
}
