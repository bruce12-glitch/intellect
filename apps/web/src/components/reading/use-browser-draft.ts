'use client';

import { useEffect, useRef, useState, type SetStateAction } from 'react';

export function useBrowserDraft<T>(key: string, initial: T, decode: (value: unknown) => T | null) {
  const initialRef = useRef(initial);
  const decodeRef = useRef(decode);
  initialRef.current = initial; decodeRef.current = decode;
  const [snapshot, setSnapshot] = useState({ key, value: initial });
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => {
    setError(false);
    let value = initialRef.current;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const decoded = decodeRef.current(JSON.parse(saved));
        if (decoded) value = decoded;
        else setError(true);
      }
    } catch { setError(true); }
    setSnapshot({ key, value }); setLoadedKey(key);
  }, [key]);
  useEffect(() => {
    if (loadedKey !== key || snapshot.key !== key) return;
    try { localStorage.setItem(key, JSON.stringify(snapshot.value)); }
    catch { setError(true); }
  }, [key, loadedKey, snapshot]);
  const value = snapshot.key === key ? snapshot.value : initial;
  const setValue = (next: SetStateAction<T>) => setSnapshot(current => {
    const previous = current.key === key ? current.value : initialRef.current;
    return { key, value: typeof next === 'function' ? (next as (value: T) => T)(previous) : next };
  });
  return { value, setValue, ready: loadedKey === key, error };
}
