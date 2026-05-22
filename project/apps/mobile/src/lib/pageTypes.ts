export const PAGE_TYPES = [
  { value: 'home', icon: 'home-outline', labelKey: 'collection.pageType.home' },
  { value: 'detail', icon: 'document-text-outline', labelKey: 'collection.pageType.detail' },
  { value: 'list', icon: 'list-outline', labelKey: 'collection.pageType.list' },
  { value: 'search', icon: 'search-outline', labelKey: 'collection.pageType.search' },
  { value: 'navigation', icon: 'compass-outline', labelKey: 'collection.pageType.navigation' },
  { value: 'document', icon: 'book-outline', labelKey: 'collection.pageType.document' },
  { value: 'download', icon: 'download-outline', labelKey: 'collection.pageType.download' },
  { value: 'other', icon: 'ellipsis-horizontal-outline', labelKey: 'collection.pageType.other' },
] as const

export const DEFAULT_PAGE_TYPE = 'detail'

export function getPageTypeConfig(value: string) {
  return PAGE_TYPES.find(pt => pt.value === value) || PAGE_TYPES.find(pt => pt.value === 'other')!
}
