import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/theme';
import { useI18n } from '../lib/i18n';
import { useCollectionViews } from '../lib/collectionViewsContext';
import type { DisplayFieldKey } from '../lib/collectionViewsStorage';

const FIELD_LABELS: Record<DisplayFieldKey, string> = {
  cover: '封面图',
  title: '标题',
  platform: '平台',
  rating: '评分',
  pageType: '页面类型',
  tags: '标签',
  lists: '分组',
  note: '备注',
  createdAt: '创建时间',
};

type ViewMode = 'mobileGrid' | 'mobileList';

export default function CollectionViewConfigScreen() {
  const navigation = useNavigation();
  const { colors } = useThemeStore();
  const { t } = useI18n();
  const { views, updateViews, resetViews, isReady } = useCollectionViews();
  const [activeMode, setActiveMode] = useState<ViewMode>('mobileGrid');

  const handleSave = () => {
    Alert.alert(t('common.success'), t('settings.saved'));
  };

  useEffect(() => {
    navigation.setOptions({
      title: '收藏展示设置',
      headerRight: () => (
        <TouchableOpacity onPress={handleSave} style={{ marginRight: 16 }}>
          <Text style={{ fontSize: 15, color: colors.primary, fontWeight: '500' }}>
            保存
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors.primary, handleSave]);

  const currentFields = views[activeMode]?.fields || [];
  const sortedFields = [...currentFields].sort((a, b) => a.order - b.order);

  const toggleField = (key: DisplayFieldKey) => {
    updateViews(prev => ({
      ...prev,
      [activeMode]: {
        fields: prev[activeMode].fields.map(f =>
          f.key === key ? { ...f, enabled: !f.enabled } : f
        ),
      },
    }));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sortedFields.length - 1) return;

    updateViews(prev => {
      const fields = [...prev[activeMode].fields].sort((a, b) => a.order - b.order);
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [fields[index], fields[targetIndex]] = [fields[targetIndex], fields[index]];

      const updatedFields = fields.map((f, i) => ({ ...f, order: i + 1 }));
      return {
        ...prev,
        [activeMode]: { fields: updatedFields },
      };
    });
  };

  const handleReset = () => {
    Alert.alert(
      '重置默认',
      '确定要重置当前视图的默认设置吗？',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: '重置',
          style: 'destructive',
          onPress: () => {
            resetViews();
          },
        },
      ]
    );
  };

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textTertiary }}>加载中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* 视图模式切换 */}
        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <Text style={{ fontSize: 13, color: colors.textTertiary, marginBottom: 8 }}>选择视图模式</Text>
          <View style={{
            flexDirection: 'row',
            backgroundColor: colors.menuBg,
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            {[
              { key: 'mobileGrid' as ViewMode, label: '卡片视图', icon: 'grid-outline' as const },
              { key: 'mobileList' as ViewMode, label: '列表视图', icon: 'list-outline' as const },
            ].map((mode) => (
              <TouchableOpacity
                key={mode.key}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 12,
                  backgroundColor: activeMode === mode.key ? colors.primary + '20' : 'transparent',
                }}
                onPress={() => setActiveMode(mode.key)}
              >
                <Ionicons
                  name={mode.icon}
                  size={16}
                  color={activeMode === mode.key ? colors.primary : colors.textTertiary}
                />
                <Text style={{
                  fontSize: 14,
                  color: activeMode === mode.key ? colors.primary : colors.textTertiary,
                  fontWeight: activeMode === mode.key ? '500' : '400',
                }}>
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 字段配置列表 */}
        <View style={{ marginHorizontal: 16, marginTop: 20 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}>
            <Text style={{ fontSize: 13, color: colors.textTertiary }}>显示字段（点击箭头调整顺序）</Text>
            <TouchableOpacity onPress={handleReset}>
              <Text style={{ fontSize: 13, color: colors.primary }}>重置默认</Text>
            </TouchableOpacity>
          </View>

          <View style={{
            backgroundColor: colors.menuBg,
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            {sortedFields.map((field, index) => (
              <View
                key={field.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 14,
                  borderBottomWidth: index < sortedFields.length - 1 ? 1 : 0,
                  borderBottomColor: colors.menuBorder,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <TouchableOpacity
                      onPress={() => moveField(index, 'up')}
                      disabled={index === 0}
                      style={{ opacity: index === 0 ? 0.3 : 1, padding: 4 }}
                    >
                      <Ionicons name="chevron-up" size={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveField(index, 'down')}
                      disabled={index === sortedFields.length - 1}
                      style={{ opacity: index === sortedFields.length - 1 ? 0.3 : 1, padding: 4 }}
                    >
                      <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 16, color: colors.text }}>
                    {FIELD_LABELS[field.key]}
                  </Text>
                </View>
                <Switch
                  value={field.enabled}
                  onValueChange={() => toggleField(field.key)}
                  trackColor={{ false: colors.border, true: colors.primary + '80' }}
                  thumbColor={field.enabled ? colors.primary : '#f4f3f4'}
                />
              </View>
            ))}
          </View>
        </View>
    </ScrollView>
  );
}
