import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/theme';
import { useI18n } from '../lib/i18n';

export type CoverStrategy = 'url' | 'brand' | 'ai';

interface CoverStrategySelectorProps {
  value: CoverStrategy[];
  onChange: (order: CoverStrategy[]) => void;
}

const strategyIcons: Record<CoverStrategy, string> = {
  url: 'link-outline',
  brand: 'color-palette-outline',
  ai: 'sparkles-outline',
};

export default function CoverStrategySelector({ value, onChange }: CoverStrategySelectorProps) {
  const colors = useThemeStore(s => s.colors);
  const { t } = useI18n();

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...value];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    onChange(newOrder);
  };

  const moveDown = (index: number) => {
    if (index >= value.length - 1) return;
    const newOrder = [...value];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onChange(newOrder);
  };

  const getLabel = (strategy: CoverStrategy) => {
    switch (strategy) {
      case 'url': return t('edit.coverUrlTab');
      case 'brand': return t('edit.coverGradientTab');
      case 'ai': return t('edit.coverAiTab');
      default: return strategy;
    }
  };

  return (
    <View style={{ gap: 8 }}>
      {value.map((strategy, index) => (
        <View
          key={strategy}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.secondaryBg,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name={strategyIcons[strategy] as any} size={18} color={colors.primary} />
            <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>
              {getLabel(strategy)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <TouchableOpacity
              onPress={() => moveUp(index)}
              disabled={index === 0}
              style={{
                padding: 6,
                borderRadius: 6,
                backgroundColor: index === 0 ? 'transparent' : colors.primaryBg,
                opacity: index === 0 ? 0.3 : 1,
              }}
            >
              <Ionicons name="arrow-up" size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => moveDown(index)}
              disabled={index === value.length - 1}
              style={{
                padding: 6,
                borderRadius: 6,
                backgroundColor: index === value.length - 1 ? 'transparent' : colors.primaryBg,
                opacity: index === value.length - 1 ? 0.3 : 1,
              }}
            >
              <Ionicons name="arrow-down" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 4 }}>
        {t('account.coverStrategyHint')}
      </Text>
    </View>
  );
}
