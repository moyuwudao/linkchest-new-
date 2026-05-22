import { Home, FileText, List, Search, Compass, BookOpen, Download, CircleDot } from 'lucide-react'
import React from 'react'

export const PAGE_TYPES = [
  { value: 'home', icon: Home, labelKey: 'collection.pageType.home' },
  { value: 'detail', icon: FileText, labelKey: 'collection.pageType.detail' },
  { value: 'list', icon: List, labelKey: 'collection.pageType.list' },
  { value: 'search', icon: Search, labelKey: 'collection.pageType.search' },
  { value: 'navigation', icon: Compass, labelKey: 'collection.pageType.navigation' },
  { value: 'document', icon: BookOpen, labelKey: 'collection.pageType.document' },
  { value: 'download', icon: Download, labelKey: 'collection.pageType.download' },
  { value: 'other', icon: CircleDot, labelKey: 'collection.pageType.other' },
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
