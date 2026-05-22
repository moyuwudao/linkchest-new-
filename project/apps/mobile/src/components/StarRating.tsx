import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/theme';

interface StarRatingProps {
  value?: number | null;
  onChange?: (value: number | null) => void;
  size?: number;
  readonly?: boolean;
  showValue?: boolean;
  allowHalf?: boolean;
}

export default function StarRating({
  value = 0,
  onChange,
  size = 20,
  readonly = false,
  showValue = false,
  allowHalf = true,
}: StarRatingProps) {
  const { colors } = useThemeStore();
  const displayValue = value ?? 0;

  const handleStarPress = (star: number, isHalf: boolean = false) => {
    if (readonly || !onChange) return;
    const newValue = isHalf ? star - 0.5 : star;
    if (displayValue === newValue) {
      onChange(null);
    } else {
      onChange(newValue);
    }
  };

  const getStarIcon = (star: number): string => {
    if (displayValue >= star) {
      return 'star';
    }
    if (allowHalf && displayValue >= star - 0.5) {
      return 'star-half';
    }
    return 'star-outline';
  };

  const getStarColor = (iconName: string) => {
    return iconName === 'star-outline' ? colors.textTertiary : colors.warning;
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <View key={star} style={{ flexDirection: 'row' }}>
          {allowHalf && !readonly && (
            <TouchableOpacity
              onPress={() => handleStarPress(star, true)}
              style={{ width: size * 0.4, height: size, marginRight: -size * 0.15 }}
              activeOpacity={0.7}
            />
          )}
          <TouchableOpacity
            onPress={() => handleStarPress(star, false)}
            disabled={readonly}
            activeOpacity={readonly ? 1 : 0.7}
            style={{ padding: 1 }}
          >
            <Ionicons
              name={getStarIcon(star) as any}
              size={size}
              color={getStarColor(getStarIcon(star))}
            />
          </TouchableOpacity>
        </View>
      ))}
      {showValue && value !== null && value > 0 && (
        <View style={{ marginLeft: 4 }}>
          <Text style={{ fontSize: size * 0.6, color: colors.textTertiary }}>
            {typeof value === 'number' ? value.toFixed(1) : value}
          </Text>
        </View>
      )}
    </View>
  );
}
