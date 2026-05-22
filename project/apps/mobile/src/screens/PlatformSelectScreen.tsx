import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/theme';
import { useI18n } from '../lib/i18n';
import { PLATFORMS, getPlatformName, getPlatformIcon, getPlatformColor } from '../lib/platforms';

export default function PlatformSelectScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const colors = useThemeStore(s => s.colors);
  const { t } = useI18n();
  const { onSelect } = route.params as { onSelect: (platform: string) => void };

  const handleSelect = (platform: string) => {
    onSelect(platform);
    navigation.goBack();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
          选择平台
        </Text>
        {PLATFORMS.map(platform => {
          const color = getPlatformColor(platform.key);
          return (
            <TouchableOpacity
              key={platform.key}
              onPress={() => handleSelect(platform.key)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                borderRadius: 10,
                backgroundColor: colors.card,
                marginBottom: 8,
              }}
              activeOpacity={0.7}
            >
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: color + '15',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons name={getPlatformIcon(platform.key) as any} size={20} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text }}>
                  {getPlatformName(platform.key)}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  {platform.example}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}
