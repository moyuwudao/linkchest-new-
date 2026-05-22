import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import {
  loadCollectionViews,
  saveCollectionViews,
  resetCollectionViews,
  type CollectionViews,
} from './collectionViewsStorage';

interface CollectionViewsContextType {
  views: CollectionViews;
  isReady: boolean;
  refreshViews: () => Promise<void>;
  updateViews: (updater: (prev: CollectionViews) => CollectionViews) => void;
  resetViews: () => Promise<void>;
}

const CollectionViewsContext = createContext<CollectionViewsContextType | undefined>(undefined);

export function CollectionViewsProvider({ children }: { children: ReactNode }) {
  const [views, setViews] = useState<CollectionViews | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadCollectionViews().then((loaded) => {
      setViews(loaded);
      setIsReady(true);
    });
  }, []);

  const refreshViews = useCallback(async () => {
    const loaded = await loadCollectionViews();
    setViews(loaded);
  }, []);

  const updateViews = useCallback((updater: (prev: CollectionViews) => CollectionViews) => {
    setViews((prev) => {
      const next = updater(prev || {} as CollectionViews);
      saveCollectionViews(next);
      return next;
    });
  }, []);

  const handleReset = useCallback(async () => {
    const defaults = await resetCollectionViews();
    setViews(defaults);
  }, []);

  // 提供默认值避免 undefined
  const defaultViews: CollectionViews = {
    mobileGrid: { fields: [
      { key: 'cover', enabled: true, order: 1 },
      { key: 'title', enabled: true, order: 2 },
      { key: 'platform', enabled: true, order: 3 },
      { key: 'rating', enabled: true, order: 4 },
      { key: 'pageType', enabled: false, order: 5 },
      { key: 'tags', enabled: true, order: 6 },
      { key: 'lists', enabled: true, order: 7 },
      { key: 'note', enabled: true, order: 8 },
      { key: 'createdAt', enabled: false, order: 9 },
    ]},
    mobileList: { fields: [
      { key: 'cover', enabled: true, order: 1 },
      { key: 'title', enabled: true, order: 2 },
      { key: 'platform', enabled: true, order: 3 },
      { key: 'rating', enabled: true, order: 4 },
      { key: 'pageType', enabled: false, order: 5 },
      { key: 'tags', enabled: true, order: 6 },
      { key: 'lists', enabled: true, order: 7 },
      { key: 'note', enabled: true, order: 8 },
      { key: 'createdAt', enabled: false, order: 9 },
    ]},
  };

  return (
    <CollectionViewsContext.Provider
      value={{
        views: views || defaultViews,
        isReady,
        refreshViews,
        updateViews,
        resetViews: handleReset,
      }}
    >
      {children}
    </CollectionViewsContext.Provider>
  );
}

export function useCollectionViews() {
  const ctx = useContext(CollectionViewsContext);
  if (!ctx) {
    throw new Error('useCollectionViews must be used within CollectionViewsProvider');
  }
  return ctx;
}
