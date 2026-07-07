import { useEffect, useState } from "react";

export function useAutosaveDraft<T>(key: string, value: T, enabled = true) {
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const raw = localStorage.getItem(key);
    setHasDraft(!!raw);
  }, [enabled, key]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const id = window.setTimeout(() => {
      localStorage.setItem(key, JSON.stringify({ value, savedAt: Date.now() }));
      setHasDraft(true);
    }, 500);
    return () => window.clearTimeout(id);
  }, [enabled, key, value]);

  function readDraft(): T | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw).value as T;
    } catch {
      return null;
    }
  }

  function clearDraft() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
    setHasDraft(false);
  }

  return { hasDraft, readDraft, clearDraft };
}
