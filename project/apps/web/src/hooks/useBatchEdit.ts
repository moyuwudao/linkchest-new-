'use client';

import { useState, useCallback } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { useI18n } from '@/lib/i18n';

export function useBatchEdit(filterTagId: string, filterListId: string) {
  const queryClient = useQueryClient();
  const { showToast, showAlert } = useToast();
  const { t } = useI18n();

  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchModal, setBatchModal] = useState<'list' | 'tag' | null>(null);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = (ids: string[]) => setSelectedIds(new Set(ids));
  const clearSelection = () => setSelectedIds(new Set());

  const batchDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/collections/batch-delete', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setSelectedIds(new Set());
      setEditMode(false);
    },
  });

  const handleBatchRemoveFromList = useCallback(async () => {
    if (!filterListId) { showToast(t('collection.noGroupFilter'), 'error'); return; }
    if (!confirm(t('collection.removeFromGroupConfirm', { count: selectedIds.size }))) return;
    try {
      await api.post('/collections/batch-update', {
        collectionIds: Array.from(selectedIds),
        removeListId: true,
      });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setSelectedIds(new Set());
      setEditMode(false);
    } catch { showAlert(t('common.operationFailed'), 'error'); }
  }, [selectedIds, filterListId, queryClient, showToast, showAlert, t]);

  const handleBatchRemoveFromTag = useCallback(async () => {
    if (!filterTagId) { showToast(t('collection.noGroupFilter'), 'error'); return; }
    if (!confirm(t('collection.removeFromTagConfirm', { count: selectedIds.size }))) return;
    try {
      await api.post('/collections/batch-update', {
        collectionIds: Array.from(selectedIds),
        removeTagIds: [filterTagId],
      });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setSelectedIds(new Set());
      setEditMode(false);
    } catch { showAlert(t('common.operationFailed'), 'error'); }
  }, [selectedIds, filterTagId, queryClient, showToast, showAlert, t]);

  return {
    editMode, setEditMode,
    selectedIds, setSelectedIds,
    batchModal, setBatchModal,
    toggleSelect, selectAll, clearSelection,
    batchDeleteMutation,
    handleBatchRemoveFromList,
    handleBatchRemoveFromTag,
  };
}

