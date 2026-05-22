'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CollectionViews, DisplayField } from '@/app/(main)/settings/CollectionViewConfig';

const STORAGE_KEY = 'linkchest-collection-views';

function getDefaultFields(): DisplayField[] {
  return [
    { key: 'cover', enabled: true, order: 1 },
    { key: 'title', enabled: true, order: 2 },
    { key: 'platform', enabled: true, order: 3 },
    { key: 'rating', enabled: true, order: 4 },
    { key: 'pageType', enabled: false, order: 5 },
    { key: 'tags', enabled: true, order: 6 },
    { key: 'lists', enabled: true, order: 7 },
    { key: 'note', enabled: true, order: 8 },
    { key: 'createdAt', enabled: false, order: 9 },
  ];
}

function getDefaultCollectionViews(): CollectionViews {
  const fields = getDefaultFields();
  return {
    webGrid: { fields: fields.map(f => ({ ...f })) },
    webList: { fields: fields.map(f => ({ ...f })) },
    mobileGrid: { fields: fields.map(f => ({ ...f })) },
    mobileList: { fields: fields.map(f => ({ ...f })) },
  };
}

function loadFromStorage(): CollectionViews | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CollectionViews;
  } catch {
    return null;
  }
}

function saveToStorage(views: CollectionViews): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}

export function useLocalCollectionViews() {
  const [views, setViewsState] = useState<CollectionViews | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const saved = loadFromStorage();
    setViewsState(saved || getDefaultCollectionViews());
    setIsReady(true);
  }, []);

  const setViews = useCallback((updater: CollectionViews | ((prev: CollectionViews) => CollectionViews)) => {
    setViewsState(prev => {
      const next = typeof updater === 'function' ? updater(prev || getDefaultCollectionViews()) : updater;
      saveToStorage(next);
      return next;
    });
  }, []);

  const resetViews = useCallback(() => {
    const defaults = getDefaultCollectionViews();
    saveToStorage(defaults);
    setViewsState(defaults);
  }, []);

  return { views: views || getDefaultCollectionViews(), setViews, resetViews, isReady };
}
