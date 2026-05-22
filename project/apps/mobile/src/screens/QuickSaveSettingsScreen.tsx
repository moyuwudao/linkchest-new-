import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '../lib/react-query';
import { api } from '../lib/api';
import { useThemeStore } from '../store/theme';
import { useI18n, getListDisplayName } from '../lib/i18n';
import CoverStrategySelector, { type CoverStrategy } from '../components/CoverStrategySelector';

type ShareMode = 'off' | 'quickPopup' | 'quickSave';
type AutoDetectLinkMode = 'none' | 'openQuickAdd' | 'autoSave';

export default function QuickSaveSettingsScreen() {
  const colors = useThemeStore(s => s.colors);
  const { t } = useI18n();

  const [shareMode, setShareMode] = useState<ShareMode>('off');
  const [autoDetectLinkMode, setAutoDetectLinkMode] = useState<AutoDetectLinkMode>('none');
  const [coverStrategyOrder, setCoverStrategyOrder] = useState<CoverStrategy[]>(['url', 'brand', 'ai']);
  const [defaultListId, setDefaultListId] = useState<string | null>(null);
  const [defaultTagIds, setDefaultTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [listSelectorVisible, setListSelectorVisible] = useState(false);
  const [tagSelectorVisible, setTagSelectorVisible] = useState(false);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  useEffect(() => {
    api.get('/users/settings').then(res => {
      const settings = res.data?.data;
      if (settings) {
        setShareMode(settings.shareMode || 'off');
        setAutoDetectLinkMode(settings.autoDetectLinkMode || 'none');
        setCoverStrategyOrder(settings.coverStrategyOrder || ['url', 'brand', 'ai']);
        setDefaultListId(settings.defaultListId || null);
        setDefaultTagIds(settings.defaultTagIds || []);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await api.get('/tags');
      return response.data.data || response.data;
    },
  });

  const { data: listsFlatData } = useQuery({
    queryKey: ['lists', 'flat'],
    queryFn: async () => {
      const response = await api.get('/lists/flat');
      return (response.data.data || []) as any[];
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (data: any) => api.put('/users/settings', data),
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || error.response?.data?.error || t('common.operationFailed'));
    },
  });

  const handleSettingsChange = (updates: Partial<{ shareMode: ShareMode; autoDetectLinkMode: AutoDetectLinkMode; coverStrategyOrder: CoverStrategy[]; defaultListId: string | null; defaultTagIds: string[] }>) => {
    const current = { shareMode, autoDetectLinkMode, coverStrategyOrder, defaultListId, defaultTagIds };
    const next = { ...current, ...updates };
    if (updates.shareMode !== undefined) setShareMode(updates.shareMode);
    if (updates.autoDetectLinkMode !== undefined) setAutoDetectLinkMode(updates.autoDetectLinkMode);
    if (updates.coverStrategyOrder !== undefined) setCoverStrategyOrder(updates.coverStrategyOrder);
    if (updates.defaultListId !== undefined) setDefaultListId(updates.defaultListId);
    if (updates.defaultTagIds !== undefined) setDefaultTagIds(updates.defaultTagIds);
    saveSettingsMutation.mutate(next);
  };

  const filteredLists = useMemo(() => {
    if (!listsFlatData) return [];
    if (!listSearchQuery.trim()) return listsFlatData;
    const query = listSearchQuery.toLowerCase();
    return listsFlatData.filter((list: any) =>
      list.name.toLowerCase().includes(query)
    );
  }, [listsFlatData, listSearchQuery]);

  const filteredTags = useMemo(() => {
    if (!tagsData) return [];
    if (!tagSearchQuery.trim()) return tagsData;
    const query = tagSearchQuery.toLowerCase();
    return (tagsData as any[]).filter((tag: any) =>
      tag.name.toLowerCase().includes(query)
    );
  }, [tagsData, tagSearchQuery]);

  const defaultListInfo = useMemo(() => {
    if (!defaultListId || !listsFlatData) return null;
    return listsFlatData.find((l: any) => l.id === defaultListId);
  }, [defaultListId, listsFlatData]);

  const defaultTagDetails = useMemo(() => {
    if (!tagsData || defaultTagIds.length === 0) return [];
    return defaultTagIds.map(id => (tagsData as any[]).find(tag => tag.id === id)).filter(Boolean);
  }, [tagsData, defaultTagIds]);

  const toggleDefaultTag = (tagId: string) => {
    const next = defaultTagIds.includes(tagId)
      ? defaultTagIds.filter(id => id !== tagId)
      : [...defaultTagIds, tagId];
    handleSettingsChange({ defaultTagIds: next });
  };

  const renderRadioItem = (
    icon: string,
    label: string,
    description: string,
    selected: boolean,
    onPress: () => void
  ) => (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon as any} size={22} color={colors.primary} style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, color: colors.text }}>{label}</Text>
        <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>{description}</Text>
      </View>
      <View style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primary : 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' }} />}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 分享链接保存 */}
      <View style={{ backgroundColor: colors.card, marginTop: 12, marginHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.secondaryBg }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>分享链接保存</Text>
        </View>
        {renderRadioItem('close-circle-outline', t('account.shareModeOff'), '', shareMode === 'off', () => handleSettingsChange({ shareMode: 'off' }))}
        {renderRadioItem('flash-outline', t('account.shareModeQuickPopup'), '', shareMode === 'quickPopup', () => handleSettingsChange({ shareMode: 'quickPopup' }))}
      </View>

      {/* 链接保存模式 */}
      <View style={{ backgroundColor: colors.card, marginTop: 12, marginHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.secondaryBg }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>链接保存模式</Text>
        </View>
        {renderRadioItem('close-circle-outline', t('account.autoDetectLinkModeOff'), '', autoDetectLinkMode === 'none', () => handleSettingsChange({ autoDetectLinkMode: 'none' }))}
        {renderRadioItem('open-outline', t('account.autoDetectLinkModeOpenQuickAdd'), '', autoDetectLinkMode === 'openQuickAdd', () => handleSettingsChange({ autoDetectLinkMode: 'openQuickAdd' }))}
        {renderRadioItem('save-outline', t('account.autoDetectLinkModeAutoSave'), '', autoDetectLinkMode === 'autoSave', () => handleSettingsChange({ autoDetectLinkMode: 'autoSave' }))}

        {/* 链接保存配置 */}
        <View style={{ marginHorizontal: 16, marginVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.secondaryBg }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>保存配置</Text>
          </View>

          {/* 封面方案排序 */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 10 }}>{t('account.coverStrategy')}</Text>
            <CoverStrategySelector
              value={coverStrategyOrder}
              onChange={(order) => handleSettingsChange({ coverStrategyOrder: order })}
            />
          </View>

          {/* 默认分组 */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
            onPress={() => { setListSearchQuery(''); setListSelectorVisible(true); }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="folder-outline" size={18} color={colors.primary} />
              <View>
                <Text style={{ fontSize: 15, color: colors.text }}>{t('account.defaultGroup')}</Text>
                <Text style={{ fontSize: 12, color: defaultListInfo ? colors.textSecondary : colors.textTertiary, marginTop: 2 }}>
                  {defaultListInfo ? getListDisplayName(defaultListInfo, t) : t('edit.pleaseSelectGroup')}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* 默认标签 */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 }}
            onPress={() => { setTagSearchQuery(''); setTagSelectorVisible(true); }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
              <View>
                <Text style={{ fontSize: 15, color: colors.text }}>{t('account.defaultTags')}</Text>
                {defaultTagDetails.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                    {defaultTagDetails.map((tag: any) => (
                      <View key={tag.id} style={{ backgroundColor: colors.tagBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 11, color: colors.tagText }}>#{tag.name}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>{t('add.selectedTags')}: 0</Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 默认分组选择弹窗 */}
      <Modal visible={listSelectorVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: colors.overlay }}>
          <View style={{ flex: 1, backgroundColor: colors.background, marginTop: 100 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{t('account.defaultGroup')}</Text>
              <TouchableOpacity onPress={() => setListSelectorVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 16, color: colors.text, margin: 16, backgroundColor: colors.inputBg }}
              placeholder={t('collection.searchPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={listSearchQuery}
              onChangeText={setListSearchQuery}
            />
            <ScrollView style={{ flex: 1 }}>
              {filteredLists.map((list: any) => (
                <TouchableOpacity
                  key={list.id}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    backgroundColor: defaultListId === list.id ? colors.primary + '10' : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onPress={() => { handleSettingsChange({ defaultListId: list.id }); setListSelectorVisible(false); }}
                >
                  <Text style={{ fontSize: 15, color: colors.text, paddingLeft: (list.depth || 0) * 16 }}>
                    {getListDisplayName(list, t)}
                  </Text>
                  {defaultListId === list.id && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 默认标签选择弹窗 */}
      <Modal visible={tagSelectorVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: colors.overlay }}>
          <View style={{ flex: 1, backgroundColor: colors.background, marginTop: 100 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{t('account.defaultTags')}</Text>
              <TouchableOpacity onPress={() => setTagSelectorVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 16, color: colors.text, margin: 16, backgroundColor: colors.inputBg }}
              placeholder={t('collection.searchPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={tagSearchQuery}
              onChangeText={setTagSearchQuery}
            />
            <ScrollView style={{ flex: 1 }}>
              {filteredTags.map((tag: any) => (
                <TouchableOpacity
                  key={tag.id}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onPress={() => toggleDefaultTag(tag.id)}
                >
                  <Text style={{ fontSize: 15, color: colors.text }}>#{tag.name}</Text>
                  <View style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: defaultTagIds.includes(tag.id) ? colors.primary : colors.border,
                    backgroundColor: defaultTagIds.includes(tag.id) ? colors.primary : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    {defaultTagIds.includes(tag.id) && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
