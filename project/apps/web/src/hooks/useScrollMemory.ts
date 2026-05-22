'use client';

import { useEffect, useRef } from 'react';

export function useScrollMemory(storageKey: string) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const savedScroll = sessionStorage.getItem(storageKey);
    if (savedScroll) {
      container.scrollTop = parseInt(savedScroll, 10);
    }
  }, [storageKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      sessionStorage.setItem(storageKey, String(container.scrollTop));
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [storageKey]);

  return containerRef;
}
