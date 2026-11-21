// Storage restrictions must never turn a successful join into a lost seat.
const memory = new Map<string, string | null>();
export const browserStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    if (memory.has(key)) return memory.get(key) ?? null;
    for (const kind of ['sessionStorage', 'localStorage'] as const) {
      try { const value = window[kind].getItem(key); if (value !== null) return value; } catch { /* Try the next store. */ }
    }
    return null;
  },
  setItem(key: string, value: string): boolean {
    if (typeof window === 'undefined') return false;
    memory.set(key, value);
    let saved = false;
    for (const kind of ['localStorage', 'sessionStorage'] as const) {
      try { window[kind].setItem(key, value); saved = true; } catch { /* Keep the active seat in memory. */ }
    }
    return saved;
  },
  removeItem(key: string) {
    memory.set(key, null);
    if (typeof window === 'undefined') return;
    for (const kind of ['localStorage', 'sessionStorage'] as const) {
      try { window[kind].removeItem(key); } catch { /* Removal is best effort. */ }
    }
  },
};

export function newRequestKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function joinRequestKey(scope: string, name: string) {
  const key = `house-rules-request:${scope}:${name.trim().replace(/\s+/g, ' ').slice(0, 24)}`;
  const saved = browserStorage.getItem(key);
  if (saved) return saved;
  const value = newRequestKey();
  browserStorage.setItem(key, value);
  return value;
}
