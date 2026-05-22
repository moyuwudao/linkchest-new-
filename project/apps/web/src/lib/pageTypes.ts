import React from 'react'
import { Home, FileText, List, Search, Compass, BookOpen, Download, CircleDot } from 'lucide-react'

export const PAGE_TYPES = [
  { value: 'home', icon: 'home', labelKey: 'collection.pageTypeHome' },
  { value: 'detail', icon: 'document', labelKey: 'collection.pageTypeDetail' },
  { value: 'list', icon: 'list', labelKey: 'collection.pageTypeList' },
  { value: 'search', icon: 'search', labelKey: 'collection.pageTypeSearch' },
  { value: 'navigation', icon: 'compass', labelKey: 'collection.pageTypeNavigation' },
  { value: 'document', icon: 'book', labelKey: 'collection.pageTypeDocument' },
  { value: 'download', icon: 'download', labelKey: 'collection.pageTypeDownload' },
  { value: 'other', icon: 'ellipsis', labelKey: 'collection.pageTypeOther' },
] as const

export const DEFAULT_PAGE_TYPE = 'detail'

export function getPageTypeConfig(value: string) {
  return PAGE_TYPES.find(pt => pt.value === value) || PAGE_TYPES.find(pt => pt.value === 'other')!
}

export function PageTypeIcon({ type, size = 14, className = '' }: { type: string; size?: number; className?: string }) {
  const config = getPageTypeConfig(type)
  const iconMap: Record<string, React.ElementType> = {
    home: Home,
    document: config.icon === 'book' ? BookOpen : FileText,
    list: List,
    search: Search,
    navigation: Compass,
    download: Download,
    other: CircleDot,
  }
  const Icon = iconMap[config.icon] || CircleDot
  return React.createElement(Icon, { size, className })
}
