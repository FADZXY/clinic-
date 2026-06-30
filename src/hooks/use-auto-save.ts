import { useRef, useCallback } from "react";

export function useAutoSave(draftKey: string, debounceMs = 1500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback((data: unknown) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(data));
      } catch { /* quota exceeded */ }
    }, debounceMs);
  }, [draftKey, debounceMs]);

  const load = useCallback(<T,>(): T | null => {
    try {
      const raw = localStorage.getItem(draftKey);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }, [draftKey]);

  const clear = useCallback(() => {
    try { localStorage.removeItem(draftKey); } catch { /* noop */ }
  }, [draftKey]);

  return { save, load, clear };
}
