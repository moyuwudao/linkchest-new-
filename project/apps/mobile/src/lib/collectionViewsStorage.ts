import AsyncStorage from '@react-native-async-storage/async-storage';

export const DISPLAY_FIELD_KEYS = [
  'cover', 'title', 'platform', 'rating', 'pageType', 'tags', 'lists', 'note', 'createdAt',
] as const;

export type DisplayFieldKey = typeof DISPLAY_FIELD_KEYS[number];

export interface DisplayField {
  key: DisplayFieldKey;
  enabled: boolean;
  order: number;
}

export interface ViewModeConfig {
  fields: DisplayField[];
}

export interface CollectionViews {
  mobileGrid: ViewModeConfig;
  mobileList: ViewModeConfig;
}

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
    mobileGrid: { fields: fields.map(f => ({ ...f })) },
    mobileList: { fields: fields.map(f => ({ ...f })) },
  };
}

export async function loadCollectionViews(): Promise<CollectionViews> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultCollectionViews();
    return JSON.parse(raw) as CollectionViews;
  } catch {
    return getDefaultCollectionViews();
  }
}

export async function saveCollectionViews(views: CollectionViews): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}

export async function resetCollectionViews(): Promise<CollectionViews> {
  const defaults = getDefaultCollectionViews();
  await saveCollectionViews(defaults);
  return defaults;
}
