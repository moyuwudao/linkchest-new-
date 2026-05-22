import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/theme';
import { useI18n } from '../lib/i18n';
import { getDefaultCoverStyle } from '../lib/platforms';
import { api } from '../lib/api';
import { cacheCoverFromUri } from '../lib/coverCache';
import LazyImage from './LazyImage';
import { useQuery } from '../lib/react-query';

type CoverMode = 'url' | 'gradient' | 'library' | 'ai';

interface CoverEditorProps {
  value: string;
  onChange: (value: string) => void;
  platform?: string;
  title?: string;
  url?: string;
  collectionId?: string;
}

/** 根据 coverImage 值推断用户上次选择的 mode */
function inferModeFromValue(val: string): CoverMode {
  if (!val) return 'gradient';
  if (val.startsWith('data:image/') || val.includes('cos.') || val.includes('myqcloud.com')) return 'library';
  return 'url';
}

/** 判断 value 是否为系统 AI 封面 */
function isSystemCoverValue(val: string, systemCovers: { cosUrl: string }[]): boolean {
  if (!val) return false;
  return systemCovers.some((c) => c.cosUrl === val);
}

/** 判断 value 是否为用户上传封面 */
function isLibraryCoverValue(val: string): boolean {
  if (!val) return false;
  return val.includes('cos.') || val.includes('myqcloud.com');
}

export default function CoverEditor({ value, onChange, platform = '', title, url, collectionId }: CoverEditorProps) {
  const colors = useThemeStore(s => s.colors);
  const { t } = useI18n();
  const [mode, setMode] = useState<CoverMode>(inferModeFromValue(value));
  const [urlValue, setUrlValue] = useState(value || '');
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const internalChangeRef = useRef(false);
  const initialCheckDoneRef = useRef(false);

  // 封面库查询
  const { data: coverLibraryData, refetch: refetchCovers } = useQuery({
    queryKey: ['coverLibrary'],
    queryFn: async () => {
      const response = await api.get('/upload/covers?limit=50');
      return response.data;
    },
    enabled: true,
  });

  // 系统封面库查询
  const { data: systemCoversData, refetch: refetchSystemCovers } = useQuery({
    queryKey: ['systemCovers'],
    queryFn: async () => {
      const response = await api.get('/upload/system-covers');
      return response.data;
    },
    enabled: true,
  });

  const systemCovers = useMemo(() => {
    return (systemCoversData?.data || []) as { id: string; cosUrl: string }[];
  }, [systemCoversData]);

  const libraryCovers = useMemo(() => {
    return (coverLibraryData?.data || []) as { id: string; cosUrl: string }[];
  }, [coverLibraryData]);

  // 随机 AI 封面
  const [randomAiCover, setRandomAiCover] = useState<{ id: string; cosUrl: string } | null>(null);

  useEffect(() => {
    if (systemCovers.length > 0 && !randomAiCover) {
      const randomIndex = Math.floor(Math.random() * systemCovers.length);
      setRandomAiCover(systemCovers[randomIndex]);
    }
  }, [systemCovers, randomAiCover]);

  // 用户最近上传的封面
  const latestLibraryCover = libraryCovers[0] || null;

  // URL 封面是否可用
  const urlCoverAvailable = useMemo(() => {
    return !!value && !value.startsWith('data:image/svg') && !isLibraryCoverValue(value) && !isSystemCoverValue(value, systemCovers);
  }, [value, systemCovers]);

  useEffect(() => {
    setUrlValue(value || '');
    if (internalChangeRef.current) {
      internalChangeRef.current = false;
      return;
    }
    setMode(inferModeFromValue(value));
  }, [value]);

  // 仅在组件首次挂载且系统封面数据加载完成后，若当前值匹配 AI 封面则自动切换到 ai 模式
  useEffect(() => {
    if (!value || internalChangeRef.current || initialCheckDoneRef.current || !systemCoversData?.data) return;
    const isSystemCover = systemCovers.some((c: any) => c.cosUrl === value);
    initialCheckDoneRef.current = true;
    if (isSystemCover && mode !== 'ai') {
      setMode('ai');
    }
  }, [systemCoversData?.data, value, systemCovers, mode]);

  const handleUrlChange = (text: string) => {
    setUrlValue(text);
    onChange(text);
  };

  const handleUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      const fileUri = asset.uri;
      const fileName = asset.name || 'cover.jpg';

      if (asset.size && asset.size > 5 * 1024 * 1024) {
        Alert.alert(t('common.hint'), t('edit.coverSizeLimit'));
        return;
      }

      setUploading(true);

      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const mimeType = asset.mimeType || 'image/jpeg';
      const imageData = `data:${mimeType};base64,${base64}`;

      const response = await api.post('/upload/cover', {
        imageData,
        originalName: fileName,
      }, {
        timeout: 30000,
      });

      const uploadedUrl = response.data?.data?.url || response.data?.url;
      if (uploadedUrl) {
        internalChangeRef.current = true;
        setUrlValue(uploadedUrl);
        onChange(uploadedUrl);
        setMode('library');
        await cacheCoverFromUri(fileUri, uploadedUrl);
      } else {
        Alert.alert(t('common.error'), t('edit.uploadFailed'));
      }
    } catch {
      Alert.alert(t('common.error'), t('edit.uploadFailed'));
    } finally {
      setUploading(false);
    }
  }, [onChange, t]);

  const handleGradientSelect = useCallback(() => {
    setUrlValue('');
    onChange('');
  }, [onChange]);

  const handleRefreshOrSyncCover = useCallback(async () => {
    setRefreshing(true);
    try {
      if (collectionId) {
        try {
          const syncResponse = await api.post(`/collections/${collectionId}/sync-cover`);
          const syncData = syncResponse.data?.data;
          if (syncData?.synced && syncData.coverImage) {
            setUrlValue(syncData.coverImage);
            onChange(syncData.coverImage);
            setMode('url');
            Alert.alert(t('common.success'), t('edit.syncCoverSuccess'));
            return;
          }
        } catch {
          // 同步接口失败，继续尝试刷新
        }
      }
      if (url) {
        const response = await api.post('/collections/parse-url', { url });
        const data = response.data?.data;
        if (data?.coverImage) {
          setUrlValue(data.coverImage);
          onChange(data.coverImage);
          setMode('url');
          Alert.alert(t('common.success'), t('edit.refreshCoverSuccess'));
        } else {
          Alert.alert(t('common.hint'), t('edit.refreshCoverFailed'));
        }
      } else {
        Alert.alert(t('common.hint'), t('edit.refreshCoverFailed'));
      }
    } catch {
      Alert.alert(t('common.error'), t('edit.refreshCoverFailed'));
    } finally {
      setRefreshing(false);
    }
  }, [collectionId, url, onChange, t]);

  const handleShuffleAi = useCallback(() => {
    if (systemCovers.length === 0) return;
    let newIndex = Math.floor(Math.random() * systemCovers.length);
    if (randomAiCover && systemCovers.length > 1) {
      while (systemCovers[newIndex].cosUrl === randomAiCover.cosUrl) {
        newIndex = Math.floor(Math.random() * systemCovers.length);
      }
    }
    const newCover = systemCovers[newIndex];
    setRandomAiCover(newCover);
  }, [systemCovers, randomAiCover]);

  const handleSelectMode = useCallback((newMode: CoverMode) => {
    setMode(newMode);
    if (newMode === 'gradient') {
      handleGradientSelect();
    } else if (newMode === 'url') {
      if (urlValue) {
        onChange(urlValue);
      }
    } else if (newMode === 'ai') {
      if (randomAiCover) {
        internalChangeRef.current = true;
        setUrlValue(randomAiCover.cosUrl);
        onChange(randomAiCover.cosUrl);
      }
    } else if (newMode === 'library') {
      if (latestLibraryCover) {
        internalChangeRef.current = true;
        setUrlValue(latestLibraryCover.cosUrl);
        onChange(latestLibraryCover.cosUrl);
      }
    }
  }, [handleGradientSelect, urlValue, randomAiCover, latestLibraryCover, onChange]);

  // 平台色封面样式
  const gradientStyle = useMemo(() => {
    return getDefaultCoverStyle(platform, title);
  }, [platform, title]);

  // 各模式的封面预览
  const urlCoverPreview = useMemo(() => {
    if (urlCoverAvailable) return value;
    return null;
  }, [urlCoverAvailable, value]);

  const isUrlSelected = mode === 'url';
  const isGradientSelected = mode === 'gradient';
  const isLibrarySelected = mode === 'library';
  const isAiSelected = mode === 'ai';

  return (
    <View style={{ backgroundColor: colors.card, padding: 16, marginBottom: 8 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 12 }}>{t('edit.coverImageLink')}</Text>

      {/* 四封面方案表格布局 */}
      <View style={{ gap: 8, marginBottom: 12 }}>
        {/* 第一行：标题 */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* URL 封面标题 */}
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: isUrlSelected ? colors.primary : colors.filterChipBg,
              borderWidth: 1,
              borderColor: isUrlSelected ? colors.primary : colors.border,
            }}
            onPress={() => handleSelectMode('url')}
            activeOpacity={0.7}
          >
            <Ionicons name="link-outline" size={12} color={isUrlSelected ? '#fff' : colors.textSecondary} />
            <Text style={{ fontSize: 11, color: isUrlSelected ? '#fff' : colors.textSecondary, fontWeight: '500' }}>
              {t('edit.coverUrlTab')}
            </Text>
          </TouchableOpacity>

          {/* 平台色封面标题 */}
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: isGradientSelected ? colors.primary : colors.filterChipBg,
              borderWidth: 1,
              borderColor: isGradientSelected ? colors.primary : colors.border,
            }}
            onPress={() => handleSelectMode('gradient')}
            activeOpacity={0.7}
          >
            <Ionicons name="color-palette-outline" size={12} color={isGradientSelected ? '#fff' : colors.textSecondary} />
            <Text style={{ fontSize: 11, color: isGradientSelected ? '#fff' : colors.textSecondary, fontWeight: '500' }}>
              {t('edit.coverGradientTab')}
            </Text>
          </TouchableOpacity>

          {/* 上传封面标题 */}
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: isLibrarySelected ? colors.primary : colors.filterChipBg,
              borderWidth: 1,
              borderColor: isLibrarySelected ? colors.primary : colors.border,
            }}
            onPress={() => handleSelectMode('library')}
            activeOpacity={0.7}
          >
            <Ionicons name="images-outline" size={12} color={isLibrarySelected ? '#fff' : colors.textSecondary} />
            <Text style={{ fontSize: 11, color: isLibrarySelected ? '#fff' : colors.textSecondary, fontWeight: '500' }}>
              {t('edit.coverLibraryTab')}
            </Text>
          </TouchableOpacity>

          {/* AI 封面标题 */}
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: isAiSelected ? colors.primary : colors.filterChipBg,
              borderWidth: 1,
              borderColor: isAiSelected ? colors.primary : colors.border,
            }}
            onPress={() => handleSelectMode('ai')}
            activeOpacity={0.7}
          >
            <Ionicons name="sparkles-outline" size={12} color={isAiSelected ? '#fff' : colors.textSecondary} />
            <Text style={{ fontSize: 11, color: isAiSelected ? '#fff' : colors.textSecondary, fontWeight: '500' }}>
              {t('edit.coverAiTab')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 第二行：封面预览 */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* URL 封面预览 */}
          <TouchableOpacity
            style={{
              flex: 1,
              aspectRatio: 3 / 4,
              borderRadius: 8,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: isUrlSelected ? colors.primary : colors.border,
              opacity: urlCoverAvailable ? 1 : 0.4,
            }}
            onPress={() => urlCoverAvailable && handleSelectMode('url')}
            disabled={!urlCoverAvailable}
            activeOpacity={0.7}
          >
            {urlCoverPreview ? (
              <LazyImage uri={urlCoverPreview} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.inputBg }}>
                <Ionicons name="link-outline" size={24} color={colors.textTertiary} />
                <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 4, textAlign: 'center', paddingHorizontal: 4 }}>
                  {url ? t('edit.refreshCoverFailed') : t('edit.coverImageUrl')}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* 平台色封面预览 */}
          <TouchableOpacity
            style={{
              flex: 1,
              aspectRatio: 3 / 4,
              borderRadius: 8,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: isGradientSelected ? colors.primary : colors.border,
            }}
            onPress={() => handleSelectMode('gradient')}
            activeOpacity={0.7}
          >
            <View
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: gradientStyle.from,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: '700',
                  color: '#ffffff',
                  textAlign: 'center',
                }}
                numberOfLines={1}
              >
                {gradientStyle.initial}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  color: '#ffffff',
                  opacity: 0.7,
                  marginTop: 4,
                  textAlign: 'center',
                }}
                numberOfLines={1}
              >
                {title || gradientStyle.platformName}
              </Text>
            </View>
          </TouchableOpacity>

          {/* 用户上传封面预览 */}
          <TouchableOpacity
            style={{
              flex: 1,
              aspectRatio: 3 / 4,
              borderRadius: 8,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: isLibrarySelected ? colors.primary : colors.border,
            }}
            onPress={() => handleSelectMode('library')}
            activeOpacity={0.7}
          >
            {latestLibraryCover ? (
              <LazyImage uri={latestLibraryCover.cosUrl} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.inputBg }}>
                <Ionicons name="cloud-upload-outline" size={24} color={colors.textTertiary} />
                <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 4, textAlign: 'center', paddingHorizontal: 4 }}>
                  {t('edit.tapToUpload')}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* AI 封面预览 */}
          <TouchableOpacity
            style={{
              flex: 1,
              aspectRatio: 3 / 4,
              borderRadius: 8,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: isAiSelected ? colors.primary : colors.border,
            }}
            onPress={() => handleSelectMode('ai')}
            activeOpacity={0.7}
          >
            {randomAiCover ? (
              <LazyImage uri={randomAiCover.cosUrl} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.inputBg }}>
                <Ionicons name="sparkles-outline" size={24} color={colors.textTertiary} />
                <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 4, textAlign: 'center', paddingHorizontal: 4 }}>
                  {t('common.loading')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 选中模式对应的操作区 */}
      {mode === 'url' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextInput
            style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, color: colors.text, backgroundColor: colors.inputBg }}
            placeholder={t('edit.coverImageUrl')}
            placeholderTextColor={colors.textTertiary}
            value={urlValue}
            onChangeText={handleUrlChange}
            autoCapitalize="none"
          />
          {(url || collectionId) ? (
            <TouchableOpacity
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                backgroundColor: refreshing ? colors.borderLight : colors.primary + '10',
                borderWidth: 1,
                borderColor: refreshing ? colors.border : colors.primary + '30',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={handleRefreshOrSyncCover}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="refresh-outline" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {mode === 'gradient' && (
        <View style={{ alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            style={{
              width: '100%',
              height: 120,
              borderRadius: 8,
              backgroundColor: gradientStyle.from + '18',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: gradientStyle.from + '40',
            }}
            onPress={handleGradientSelect}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: gradientStyle.from }}>
              {title || gradientStyle.platformName}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>{t('edit.tapToSelectGradient')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'library' && (
        <View>
          {/* 用户封面网格 */}
          {libraryCovers.length > 0 ? (
            <View style={{ height: 200 }}>
              <FlatList
                data={[{ isUploadEntry: true }, ...libraryCovers]}
                keyExtractor={(item: any) => item.isUploadEntry ? 'upload-entry' : item.id}
                numColumns={3}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled
                renderItem={({ item }: { item: any }) => {
                  if (item.isUploadEntry) {
                    return (
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          margin: 4,
                          aspectRatio: 3 / 4,
                          borderRadius: 6,
                          overflow: 'hidden',
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderStyle: 'dashed',
                          backgroundColor: colors.inputBg,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                        onPress={handleUpload}
                        disabled={uploading}
                        activeOpacity={0.7}
                      >
                        {uploading ? (
                          <ActivityIndicator color={colors.primary} />
                        ) : (
                          <>
                            <Ionicons name="cloud-upload-outline" size={24} color={colors.textTertiary} />
                            <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 4, textAlign: 'center', paddingHorizontal: 4 }}>
                              {t('edit.tapToUpload')}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        margin: 4,
                        aspectRatio: 3 / 4,
                        borderRadius: 6,
                        overflow: 'hidden',
                        borderWidth: value === item.cosUrl ? 2 : 0,
                        borderColor: colors.primary,
                      }}
                      onPress={() => {
                        internalChangeRef.current = true;
                        setUrlValue(item.cosUrl);
                        onChange(item.cosUrl);
                      }}
                      activeOpacity={0.7}
                    >
                      <LazyImage uri={item.cosUrl} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </TouchableOpacity>
                  );
                }}
                refreshControl={
                  <RefreshControl refreshing={false} onRefresh={() => refetchCovers()} tintColor={colors.primary} />
                }
              />
            </View>
          ) : (
            <>
              {/* 上传入口 */}
              <TouchableOpacity
                style={{
                  width: '100%',
                  height: 80,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: colors.border,
                  borderStyle: 'dashed',
                  backgroundColor: colors.inputBg,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
                onPress={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={28} color={colors.textSecondary} />
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>{t('edit.tapToUpload')}</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }}>
                <Ionicons name="images-outline" size={36} color={colors.textTertiary} />
                <Text style={{ fontSize: 14, color: colors.textTertiary, marginTop: 8 }}>{t('edit.noCoversInLibrary')}</Text>
                <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 4 }}>{t('edit.uploadToSeeHere')}</Text>
              </View>
            </>
          )}

          <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 8, lineHeight: 16 }}>
            {t('cover.uploadShareHint')}
          </Text>
        </View>
      )}

      {mode === 'ai' && (
        <View>
          {/* 切换按钮 */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: colors.primary + '10',
              borderWidth: 1,
              borderColor: colors.primary + '30',
              marginBottom: 12,
            }}
            onPress={handleShuffleAi}
            activeOpacity={0.7}
          >
            <Ionicons name="shuffle-outline" size={18} color={colors.primary} />
            <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>{t('edit.randomCover')}</Text>
          </TouchableOpacity>

          {/* AI 封面网格 */}
          {systemCovers.length > 0 ? (
            <View style={{ height: 200 }}>
              <FlatList
                data={systemCovers}
                keyExtractor={(item: any) => item.id}
                numColumns={3}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled
                renderItem={({ item }: { item: any }) => (
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      margin: 4,
                      aspectRatio: 3 / 4,
                      borderRadius: 6,
                      overflow: 'hidden',
                      borderWidth: (randomAiCover?.cosUrl === item.cosUrl || value === item.cosUrl) ? 2 : 0,
                      borderColor: colors.primary,
                    }}
                    onPress={() => {
                      internalChangeRef.current = true;
                      setRandomAiCover(item);
                      setUrlValue(item.cosUrl);
                      onChange(item.cosUrl);
                    }}
                    activeOpacity={0.7}
                  >
                    <LazyImage uri={item.cosUrl} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  </TouchableOpacity>
                )}
                refreshControl={
                  <RefreshControl refreshing={false} onRefresh={() => refetchSystemCovers()} tintColor={colors.primary} />
                }
              />
            </View>
          ) : (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 30 }}>
              <Ionicons name="library-outline" size={36} color={colors.textTertiary} />
              <Text style={{ fontSize: 14, color: colors.textTertiary, marginTop: 8 }}>{t('edit.noCoversInLibrary')}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
