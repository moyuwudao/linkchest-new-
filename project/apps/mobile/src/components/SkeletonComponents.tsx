/**
 * 移动端骨架屏 + 空状态组件
 * 用于替换全屏纯文字 loading，提供更友好的加载体验
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useThemeStore } from '../store/theme';

// ========== 骨架屏动画 Hook ==========
export function useSkeletonAnimation() {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  return animatedValue;
}

// ========== 骨架元素 ==========
interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: SkeletonProps) {
  const animatedValue = useSkeletonAnimation();
  const colors = useThemeStore(s => s.colors);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.borderLight,
          opacity,
        },
        style,
      ]}
    />
  );
}

// ========== 收藏卡片骨架屏（网格视图）==========
export function CollectionCardSkeleton({ colors }: { colors: any }) {
  const animatedValue = useSkeletonAnimation();
  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <Animated.View
        style={{
          width: 120,
          height: 100,
          backgroundColor: colors.borderLight,
          opacity,
        }}
      />
      <View style={{ flex: 1, padding: 12, gap: 6 }}>
        <Animated.View
          style={[
            {
              height: 14,
              borderRadius: 4,
              backgroundColor: colors.borderLight,
              opacity,
            },
          ]}
        />
        <Animated.View
          style={[
            {
              height: 12,
              width: '70%',
              borderRadius: 4,
              backgroundColor: colors.borderLight,
              opacity,
            },
          ]}
        />
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
          <Animated.View
            style={[
              { height: 20, width: 56, borderRadius: 4, backgroundColor: colors.borderLight, opacity },
            ]}
          />
          <Animated.View
            style={[
              { height: 20, width: 40, borderRadius: 4, backgroundColor: colors.borderLight, opacity },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

// ========== 收藏列表骨架屏（表格视图）==========
export function CollectionRowSkeleton({ colors }: { colors: any }) {
  const animatedValue = useSkeletonAnimation();
  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        gap: 8,
      }}
    >
      <Animated.View
        style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.borderLight, opacity }}
      />
      <Animated.View
        style={{ flex: 1, height: 14, borderRadius: 4, backgroundColor: colors.borderLight, opacity }}
      />
      <Animated.View
        style={{ width: 56, height: 12, borderRadius: 4, backgroundColor: colors.borderLight, opacity }}
      />
      <Animated.View
        style={{ width: 64, height: 12, borderRadius: 4, backgroundColor: colors.borderLight, opacity }}
      />
    </View>
  );
}

// ========== 收藏详情骨架屏 ==========
export function CollectionDetailSkeleton({ colors }: { colors: any }) {
  const animatedValue = useSkeletonAnimation();
  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.View
        style={{
          width: '100%',
          height: 220,
          backgroundColor: colors.borderLight,
          opacity,
        }}
      />
      <View style={{ padding: 16, gap: 12 }}>
        <Animated.View
          style={{ width: 64, height: 20, borderRadius: 4, backgroundColor: colors.borderLight, opacity }}
        />
        <Animated.View
          style={{ height: 24, borderRadius: 4, backgroundColor: colors.borderLight, opacity }}
        />
        <Animated.View
          style={{ height: 24, width: '60%', borderRadius: 4, backgroundColor: colors.borderLight, opacity }}
        />
        <Animated.View
          style={{ height: 40, borderRadius: 8, backgroundColor: colors.borderLight, opacity }}
        />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Animated.View
            style={{ flex: 1, height: 44, borderRadius: 8, backgroundColor: colors.borderLight, opacity }}
          />
          <Animated.View
            style={{ flex: 1, height: 44, borderRadius: 8, backgroundColor: colors.borderLight, opacity }}
          />
        </View>
      </View>
    </View>
  );
}

// ========== 分组列表骨架屏 ==========
export function ListsSkeleton({ colors }: { colors: any }) {
  const animatedValue = useSkeletonAnimation();
  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 8 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
          }}
        >
          <Animated.View
            style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.borderLight, opacity }}
          />
          <View style={{ flex: 1, gap: 6 }}>
            <Animated.View
              style={{ height: 16, width: `${60 - i * 5}%`, borderRadius: 4, backgroundColor: colors.borderLight, opacity }}
            />
            <Animated.View
              style={{ height: 12, width: '30%', borderRadius: 4, backgroundColor: colors.borderLight, opacity }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

// ========== 分享管理骨架屏 ==========
export function ShareManagementSkeleton({ colors }: { colors: any }) {
  const animatedValue = useSkeletonAnimation();
  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={{ padding: 12, gap: 12 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View
          key={i}
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Animated.View style={{ height: 20, width: 64, borderRadius: 4, backgroundColor: colors.borderLight, opacity }} />
              <Animated.View style={{ height: 20, width: 48, borderRadius: 4, backgroundColor: colors.borderLight, opacity }} />
            </View>
          </View>
          <Animated.View style={{ height: 16, width: '50%', borderRadius: 4, backgroundColor: colors.borderLight, opacity, marginBottom: 8 }} />
          <Animated.View style={{ height: 12, width: '25%', borderRadius: 4, backgroundColor: colors.borderLight, opacity }} />
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
            {[0, 1, 2, 3].map(j => (
              <Animated.View key={j} style={{ height: 14, width: 48, borderRadius: 4, backgroundColor: colors.borderLight, opacity }} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

// ========== 分享详情骨架屏 ==========
export function ShareDetailSkeleton({ colors }: { colors: any }) {
  const animatedValue = useSkeletonAnimation();
  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.View style={{ width: '100%', height: 180, backgroundColor: colors.borderLight, opacity }} />
      <View style={{ padding: 16, gap: 12 }}>
        <Animated.View style={{ height: 24, width: '70%', borderRadius: 6, backgroundColor: colors.borderLight, opacity }} />
        <Animated.View style={{ height: 16, width: '90%', borderRadius: 4, backgroundColor: colors.borderLight, opacity }} />
        <Animated.View style={{ height: 16, width: '60%', borderRadius: 4, backgroundColor: colors.borderLight, opacity }} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <Animated.View style={{ height: 28, width: 80, borderRadius: 14, backgroundColor: colors.borderLight, opacity }} />
          <Animated.View style={{ height: 28, width: 64, borderRadius: 14, backgroundColor: colors.borderLight, opacity }} />
        </View>
        <View style={{ gap: 10, marginTop: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={{ backgroundColor: colors.card, borderRadius: 10, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', gap: 12, padding: 12 }}>
                <Animated.View style={{ width: 80, height: 60, borderRadius: 8, backgroundColor: colors.borderLight, opacity }} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Animated.View style={{ height: 14, borderRadius: 4, backgroundColor: colors.borderLight, opacity }} />
                  <Animated.View style={{ height: 12, width: '60%', borderRadius: 4, backgroundColor: colors.borderLight, opacity }} />
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ========== 统计页骨架屏 ==========
export function StatsSkeleton({ colors }: { colors: any }) {
  const animatedValue = useSkeletonAnimation();
  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={{ padding: 12, gap: 12 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Animated.View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.borderLight, opacity }} />
            <Animated.View style={{ height: 14, width: 64, borderRadius: 4, backgroundColor: colors.borderLight, opacity }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1, height: 8, backgroundColor: colors.borderLight, borderRadius: 4, opacity: 0.5 }} />
            <Animated.View style={{ height: 14, width: 36, borderRadius: 4, backgroundColor: colors.borderLight, opacity }} />
            <Animated.View style={{ height: 12, width: 44, borderRadius: 4, backgroundColor: colors.borderLight, opacity }} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ========== 标签管理骨架屏 ==========
export function TagManageSkeleton({ colors }: { colors: any }) {
  const animatedValue = useSkeletonAnimation();
  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 8 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
          <Animated.View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.borderLight, opacity }} />
          <Animated.View style={{ height: 20, width: 72, borderRadius: 10, backgroundColor: colors.borderLight, opacity, marginLeft: 12 }} />
          <Animated.View style={{ height: 12, width: 40, borderRadius: 4, backgroundColor: colors.borderLight, opacity, marginLeft: 8 }} />
          <View style={{ flex: 1 }} />
          <Animated.View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.borderLight, opacity }} />
        </View>
      ))}
    </View>
  );
}
