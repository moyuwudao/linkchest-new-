'use client';

import { useState, useCallback } from 'react';
import {
  LayoutGrid, List, Eye, EyeOff, GripVertical, RotateCcw, Check,
  Image, Type, Globe, Star, Tag, FolderOpen, FileText, Clock, Layers
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/Toast';
import { useLocalCollectionViews } from '@/hooks/useLocalCollectionViews';

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
  webGrid: ViewModeConfig;
  webList: ViewModeConfig;
  mobileGrid: ViewModeConfig;
  mobileList: ViewModeConfig;
}

const FIELD_ICONS: Record<DisplayFieldKey, typeof Image> = {
  cover: Image,
  title: Type,
  platform: Globe,
  rating: Star,
  pageType: Layers,
  tags: Tag,
  lists: FolderOpen,
  note: FileText,
  createdAt: Clock,
};

function getFieldLabel(key: DisplayFieldKey, t: (key: string) => string): string {
  const map: Record<DisplayFieldKey, string> = {
    cover: 'collectionView.field.cover',
    title: 'collectionView.field.title',
    platform: 'collectionView.field.platform',
    rating: 'collectionView.field.rating',
    pageType: 'collectionView.field.pageType',
    tags: 'collectionView.field.tags',
    lists: 'collectionView.field.lists',
    note: 'collectionView.field.note',
    createdAt: 'collectionView.field.createdAt',
  };
  return t(map[key]);
}

type ViewMode = 'webGrid' | 'webList';

export default function CollectionViewConfig() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const { views, setViews, isReady } = useLocalCollectionViews();
  const [activeMode, setActiveMode] = useState<ViewMode>('webGrid');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [originalSnapshot, setOriginalSnapshot] = useState<string>('');

  // 组件挂载时记录原始快照用于判断是否有变更
  useState(() => {
    setOriginalSnapshot(JSON.stringify(views));
  });

  const currentFields = views[activeMode]?.fields || [];
  const sortedFields = [...currentFields].sort((a, b) => a.order - b.order);

  const toggleField = useCallback((key: DisplayFieldKey) => {
    setViews(prev => ({
      ...prev,
      [activeMode]: {
        fields: prev[activeMode].fields.map(f =>
          f.key === key ? { ...f, enabled: !f.enabled } : f
        ),
      },
    }));
  }, [activeMode, setViews]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setViews(prev => {
      const fields = [...prev[activeMode].fields].sort((a, b) => a.order - b.order);
      const [removed] = fields.splice(draggedIndex, 1);
      fields.splice(index, 0, removed);

      const updatedFields = fields.map((f, i) => ({ ...f, order: i + 1 }));
      return {
        ...prev,
        [activeMode]: { fields: updatedFields },
      };
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleReset = () => {
    setViews(prev => {
      const defaultFields = [
        { key: 'cover' as DisplayFieldKey, enabled: true, order: 1 },
        { key: 'title' as DisplayFieldKey, enabled: true, order: 2 },
        { key: 'platform' as DisplayFieldKey, enabled: true, order: 3 },
        { key: 'rating' as DisplayFieldKey, enabled: true, order: 4 },
        { key: 'pageType' as DisplayFieldKey, enabled: false, order: 5 },
        { key: 'tags' as DisplayFieldKey, enabled: true, order: 6 },
        { key: 'lists' as DisplayFieldKey, enabled: true, order: 7 },
        { key: 'note' as DisplayFieldKey, enabled: true, order: 8 },
        { key: 'createdAt' as DisplayFieldKey, enabled: false, order: 9 },
      ];
      return {
        ...prev,
        [activeMode]: { fields: defaultFields.map(f => ({ ...f })) },
      };
    });
  };

  const handleSave = () => {
    showToast(t('settings.saved'), 'success');
    setOriginalSnapshot(JSON.stringify(views));
  };

  const hasChanges = JSON.stringify(views) !== originalSnapshot;

  const modeOptions: { key: ViewMode; labelKey: string; icon: typeof LayoutGrid }[] = [
    { key: 'webGrid', labelKey: 'collectionView.cardView', icon: LayoutGrid },
    { key: 'webList', labelKey: 'collectionView.listView', icon: List },
  ];

  if (!isReady) {
    return (
      <div className="card">
        <div className="px-5 py-8 flex items-center justify-center">
          <div className="w-6 h-6 animate-spin border-2 border-chest-300 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="px-5 py-3 border-b border-chest-100 dark:border-chest-700/50 flex items-center justify-between">
        <h3 className="text-sm font-medium text-taupe dark:text-parchment/60 uppercase tracking-wide">
          {t('collectionView.title')}
        </h3>
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* 视图模式切换 */}
        <div>
          <label className="text-sm text-taupe dark:text-parchment/60 mb-2 block">{t('collectionView.selectViewMode')}</label>
          <div className="flex gap-2">
            {modeOptions.map((mode) => {
              const Icon = mode.icon;
              const isActive = activeMode === mode.key;
              return (
                <button
                  key={mode.key}
                  onClick={() => setActiveMode(mode.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                    isActive
                      ? 'border-chest-500 bg-chest-500/5 dark:bg-amber-400/10 text-chest-500 dark:text-amber-400'
                      : 'border-chest-200 dark:border-chest-600/40 text-chest-500 dark:text-parchment/70 hover:border-chest-300 dark:hover:border-chest-500'
                  }`}
                >
                  <Icon size={16} />
                  {t(mode.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* 字段配置列表 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-taupe dark:text-parchment/60">{t('collectionView.displayFields')}</label>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-chest-400 hover:text-chest-500 transition-colors cursor-pointer"
            >
              <RotateCcw size={12} />
              {t('collectionView.resetDefault')}
            </button>
          </div>

          <div className="space-y-1.5">
            {sortedFields.map((field, index) => {
              const Icon = FIELD_ICONS[field.key];
              return (
                <div
                  key={field.key}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-move ${
                    draggedIndex === index
                      ? 'border-chest-400 bg-chest-500/5 dark:bg-amber-400/10 opacity-50'
                      : 'border-chest-100 dark:border-chest-700/50 bg-white dark:bg-chest-800/30 hover:border-chest-200 dark:hover:border-chest-600'
                  }`}
                >
                  <GripVertical size={16} className="text-chest-300 dark:text-parchment/30 flex-shrink-0" />
                  <Icon size={16} className="text-chest-400 dark:text-parchment/50 flex-shrink-0" />
                  <span className="flex-1 text-sm text-charcoal dark:text-parchment/90">
                    {getFieldLabel(field.key, t)}
                  </span>
                  <button
                    onClick={() => toggleField(field.key)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                      field.enabled
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-chest-100 text-chest-400 dark:bg-chest-700 dark:text-parchment/40'
                    }`}
                  >
                    {field.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                    {field.enabled ? t('collectionView.show') : t('collectionView.hide')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex items-center gap-2 px-5 py-2.5 bg-chest-500 text-white rounded-lg hover:bg-chest-600 disabled:bg-taupe/20 text-sm transition-colors cursor-pointer"
          >
            <Check size={16} />
            {t('collectionView.saveSettings')}
          </button>
        </div>
      </div>
    </div>
  );
}
