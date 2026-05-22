import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, Animated, StyleProp, ImageStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCachedCoverPath, cacheCover } from '../lib/coverCache';
import { getDefaultCoverStyle, GradientCoverStyle } from '../lib/platforms';

/** 增强版封面 Fallback：纯色背景 + 图标 + 首字 + 平台名 */
function CoverFallback({ style, coverStyle }: { style?: StyleProp<ImageStyle>; coverStyle: GradientCoverStyle }) {
  return (
    <View
      style={[
        {
          backgroundColor: coverStyle.from,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* 半透明装饰圆 */}
      <View
        style={{
          position: 'absolute',
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.15)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons name={coverStyle.icon as any} size={22} color="rgba(255,255,255,0.85)" />
      </View>
      {/* 首字 */}
      <Text
        style={{
          fontSize: 36,
          fontWeight: '700',
          color: '#ffffff',
          marginTop: 48,
          textShadowColor: 'rgba(0,0,0,0.3)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        }}
      >
        {coverStyle.initial}
      </Text>
      {/* 平台名 */}
      <Text
        style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.5)',
          marginTop: 4,
        }}
        numberOfLines={1}
      >
        {coverStyle.platformName}
      </Text>
    </View>
  );
}

interface LazyImageProps {
  uri: string | null;
  style?: StyleProp<ImageStyle>;
  fallbackPlatform?: string;
  fallbackTitle?: string;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  showGradientFallback?: boolean;
}

export default function LazyImage({
  uri,
  style,
  fallbackPlatform = '',
  fallbackTitle,
  resizeMode = 'cover',
  showGradientFallback = false,
}: LazyImageProps) {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const coverStyle = fallbackPlatform
    ? getDefaultCoverStyle(fallbackPlatform, fallbackTitle)
    : null;

  const resolveUri = useCallback(async (sourceUri: string) => {
    const cached = await getCachedCoverPath(sourceUri);
    if (cached) {
      setLocalUri(cached);
      return;
    }

    // 无缓存：先显示远程 URI，后台下载缓存
    setLocalUri(sourceUri);
    cacheCover(sourceUri).then((path) => {
      if (path) {
        // 仅当当前仍显示原始 URI 时才切换（避免 uri 已变更）
        setLocalUri((current) => (current === sourceUri ? path : current));
      }
    }).catch(() => {
      // 缓存失败不影响展示
    });
  }, []);

  useEffect(() => {
    if (!uri) {
      setLocalUri(null);
      setLoaded(false);
      setHasError(false);
      fadeAnim.setValue(0);
      return;
    }
    setLoaded(false);
    setHasError(false);
    fadeAnim.setValue(0);
    resolveUri(uri);
  }, [uri, resolveUri, fadeAnim]);

  const onLoad = useCallback(() => {
    setLoaded(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const onError = useCallback(() => {
    setHasError(true);
    setLoaded(false);
    fadeAnim.setValue(0);

    // 网络加载失败时，再次尝试本地缓存（可能缓存文件已损坏但元数据仍在）
    if (uri && localUri === uri) {
      getCachedCoverPath(uri).then((cached) => {
        if (cached && cached !== uri) {
          setLocalUri(cached);
          setHasError(false);
        }
      }).catch(() => {});
    }
  }, [fadeAnim, localUri, uri]);

  if (!localUri || hasError) {
    if (showGradientFallback && coverStyle) {
      return <CoverFallback style={style} coverStyle={coverStyle} />;
    }
    return (
      <View style={[{ backgroundColor: '#E5E5E5', justifyContent: 'center', alignItems: 'center' }, style]}>
        {coverStyle ? (
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: coverStyle.from, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#FFFFFF' }}>{coverStyle.initial}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      {!loaded && coverStyle ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <CoverFallback style={{ width: '100%', height: '100%' }} coverStyle={coverStyle} />
        </View>
      ) : null}
      <Animated.Image
        source={{ uri: localUri }}
        style={[{ width: '100%', height: '100%' }, style, { opacity: fadeAnim }]}
        resizeMode={resizeMode}
        onLoad={onLoad}
        onError={onError}
      />
    </View>
  );
}
