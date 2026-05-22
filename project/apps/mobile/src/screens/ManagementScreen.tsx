import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/theme';
import { useI18n } from '../lib/i18n';
import ListsScreen from './ListsScreen';
import TagManageScreen from './TagManageScreen';

export default function ManagementScreen() {
  const { colors } = useThemeStore();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'groups' | 'tags'>('groups');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', backgroundColor: colors.tabBg, marginHorizontal: 12, marginTop: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: activeTab === 'groups' ? colors.tabActiveBg : 'transparent' }}
          onPress={() => setActiveTab('groups')}
        >
          <Text style={{ fontSize: 13, color: activeTab === 'groups' ? colors.tabActiveText : colors.tabText, fontWeight: '500' }}>
            {t('management.groups')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: activeTab === 'tags' ? colors.tabActiveBg : 'transparent' }}
          onPress={() => setActiveTab('tags')}
        >
          <Text style={{ fontSize: 13, color: activeTab === 'tags' ? colors.tabActiveText : colors.tabText, fontWeight: '500' }}>
            {t('management.tags')}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'groups' ? <ListsScreen /> : <TagManageScreen />}
    </View>
  );
}
