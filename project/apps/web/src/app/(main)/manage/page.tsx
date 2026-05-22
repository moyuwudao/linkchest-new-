'use client';

import { useState } from 'react';
import { FolderOpen, Tag as TagIcon, Share2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n';
import ListsSection from './ListsSection';
import TagsSection from './TagsSection';
import SharesSection from './SharesSection';
import TrashSection from './TrashSection';

export default function ManagePage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'lists' | 'tags' | 'shares' | 'trash'>('lists');

  const tabs = [
    { key: 'lists' as const, icon: FolderOpen, label: t('manage.lists') || '分组管理' },
    { key: 'tags' as const, icon: TagIcon, label: t('manage.tags') || '标签管理' },
    { key: 'shares' as const, icon: Share2, label: t('manage.shares') || '分享管理' },
    { key: 'trash' as const, icon: Trash2, label: t('manage.trash') || '回收站管理' },
  ];

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div>
          <h2 className="text-2xl font-bold text-charcoal dark:text-parchment tracking-tight">{t('manage.title') || '管理'}</h2>
        </div>

        {/* Tabs - 参考设置页的 pill 式 Tab 设计 */}
        <div className="flex items-center gap-1 p-1 bg-chest-500/5 dark:bg-chest-700/20 rounded-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-chest-600 text-chest-500 dark:text-amber-400 shadow-sm'
                    : 'text-taupe/70 dark:text-parchment/50 hover:text-charcoal dark:hover:text-parchment'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'lists' && <ListsSection />}
            {activeTab === 'tags' && <TagsSection />}
            {activeTab === 'shares' && <SharesSection />}
            {activeTab === 'trash' && <TrashSection />}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
