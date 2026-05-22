'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, ChevronDown, ChevronRight, FolderOpen, Check } from 'lucide-react';
import { useI18n, getListPathDisplayName } from '@/lib/i18n';

interface ListItem {
  id: string;
  name: string;
  parentId: string | null;
  collectionCount: number;
  totalCollectionCount?: number;
  isDefault?: boolean;
  depth?: number;
  path?: { id: string; name: string; isDefault?: boolean }[];
  pathName?: string | null;
  hasChildren?: boolean;
}

interface ListSelectorProps {
  lists: ListItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}

export default function ListSelector({ lists, selectedId, onSelect, onCreateNew }: ListSelectorProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedList = lists.find(l => l.id === selectedId);

  const filteredLists = useMemo(() => {
    if (!search.trim()) return lists;
    const query = search.toLowerCase();
    return lists.filter(l => l.name.toLowerCase().includes(query) || l.pathName?.toLowerCase().includes(query));
  }, [lists, search]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-paper dark:bg-chest-800 border border-taupe/15 dark:border-parchment/10 rounded-md hover:bg-white dark:hover:bg-chest-700 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FolderOpen size={16} className="text-chest-500 dark:text-amber-400 flex-shrink-0" />
          <span className="truncate text-charcoal dark:text-parchment">
            {selectedList ? getListPathDisplayName(selectedList, t) : t('add.selectGroup')}
          </span>
        </div>
        <ChevronDown size={16} className={`text-taupe flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-chest-800 border border-taupe/15 dark:border-parchment/10 rounded-md shadow-float overflow-hidden">
          {/* 搜索框 */}
          <div className="p-2 border-b border-chest-500/[0.06] dark:border-parchment/5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('common.search')}
                className="w-full pl-8 pr-8 py-2 text-sm bg-paper dark:bg-chest-800 border border-taupe/15 dark:border-parchment/10 rounded-md focus:outline-none focus:ring-2 focus:ring-chest-500/20 focus:border-chest-500/40"
                autoFocus
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X size={14} className="text-taupe" />
                </button>
              )}
            </div>
          </div>

          {/* 列表 */}
          <div className="max-h-64 overflow-y-auto">
            {filteredLists.map(item => (
              <div key={item.id}>
                <button
                  type="button"
                  onClick={() => { onSelect(item.id); setIsOpen(false); setSearch(''); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-chest-50 dark:hover:bg-chest-700 transition-colors ${selectedId === item.id ? 'bg-chest-500/5 dark:bg-amber-400/10' : ''}`}
                  style={{ paddingLeft: 12 + (item.depth || 0) * 20 }}
                >
                  {item.hasChildren ? (
                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }} className="p-0.5">
                      {expandedIds.has(item.id) ? <ChevronDown size={14} className="text-taupe" /> : <ChevronRight size={14} className="text-taupe" />}
                    </button>
                  ) : (
                    <div className="w-5" />
                  )}
                  <FolderOpen size={14} className={selectedId === item.id ? 'text-chest-500 dark:text-amber-400' : 'text-taupe'} />
                  <span className={`flex-1 text-left truncate ${selectedId === item.id ? 'text-chest-500 dark:text-amber-400 font-medium' : 'text-charcoal dark:text-parchment'}`}>
                    {getListPathDisplayName(item, t)}
                  </span>
                  {selectedId === item.id && <Check size={14} className="text-chest-500 dark:text-amber-400" />}
                </button>
              </div>
            ))}
            {filteredLists.length === 0 && (
              <div className="px-3 py-6 text-center text-taupe text-sm">{t('common.noResults')}</div>
            )}
          </div>

          {/* 新建按钮 */}
          <div className="p-2 border-t border-chest-500/[0.06] dark:border-parchment/5">
            <button
              type="button"
              onClick={() => { setIsOpen(false); onCreateNew(); }}
              className="w-full px-3 py-2 text-sm text-chest-500 dark:text-amber-400 hover:bg-chest-50 dark:hover:bg-chest-700 rounded-md transition-colors text-center"
            >
              + {t('add.createGroup')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
