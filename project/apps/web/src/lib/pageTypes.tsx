import { Home, FileText, List, Search, Compass, BookOpen, Download, CircleDot } from 'lucide-react'
import React from 'react'

export const PAGE_TYPES = [
  { value: 'home', icon: Home, labelKey: 'collection.pageTypeHome' },
  { value: 'detail', icon: FileText, labelKey: 'collection.pageTypeDetail' },
  { value: 'list', icon: List, labelKey: 'collection.pageTypeList' },
  { value: 'search', icon: Search, labelKey: 'collection.pageTypeSearch' },
  { value: 'navigation', icon: Compass, labelKey: 'collection.pageTypeNavigation' },
  { value: 'document', icon: BookOpen, labelKey: 'collection.pageTypeDocument' },
  { value: 'download', icon: Download, labelKey: 'collection.pageTypeDownload' },
  { value: 'other', icon: CircleDot, labelKey: 'collection.pageTypeOther' },
] as const

export const DEFAULT_PAGE_TYPE = 'detail'

export function getPageTypeConfig(value: string) {
  return PAGE_TYPES.find(pt => pt.value === value) || PAGE_TYPES.find(pt => pt.value === 'other')!
}

export function PageTypeIcon({ type, size = 14, className = '' }: { type: string; size?: number; className?: string }) {
  const config = getPageTypeConfig(type)
  const Icon = config.icon
  return <Icon size={size} className={className} />
}
