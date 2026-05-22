import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '../lib/react-query';
import Toast from 'react-native-toast-message';
import { api } from '../lib/api';
import { getPlatformIcon, getPlatformName } from '../lib/platforms';
import { useThemeStore } from '../store/theme';
import { useI18n, getListPathDisplayName } from '../lib/i18n';
import { logEvent } from '../lib/analytics';

interface List {
  id: string;
  name: string;
  parentId: string | null;
  collectionCount: number;
  totalCollectionCount?: number;
  isDefault?: boolean;
  depth?: number;
  path?: { id: string; name: string; isDefault?: boolean }[];
  pathName?: string | null;
}

interface Tag {
  id: string;
  name: string;
  collectionCount: number;
}

interface Collection {
  id: string;
  title: string;
  coverImage: string | null;
  platform: string;
}

type ShareType = 'ALL' | 'COLLECTION' | 'LIST' | 'TAG';
type ExpiresIn = '1h' | '24h' | '1w' | 'never';

export default function CreateShareScreen() {
  const navigation = useNavigation();
  const colors = useThemeStore(s => s.colors);
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [shareType, setShareType] = useState<ShareType>('ALL');
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const [shareTitle, setShareTitle] = useState('');
  const [expiresIn, setExpiresIn] = useState<ExpiresIn>('never');
  const [password, setPassword] = useState('');
  const [description, setDescription] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: lists } = useQuery({
    queryKey: ['lists'],
    queryFn: async () => {
      const response = await api.get('/lists/flat');
      return (response.data.data || response.data) as List[];
    },
  });

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await api.get('/tags');
      return (response.data.data || response.data) as Tag[];
    },
  });

  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const response = await api.get('/collections');
      return (response.data.data || response.data) as Collection[];
    },
  });

  const [returnedPassword, setReturnedPassword] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/shares', data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['shares'] });
      logEvent('create_share', { type: shareType });
      const shareUrl = response.data.shareUrl;
      setGeneratedLink(shareUrl);
      if (response.data.password) {
        setReturnedPassword(response.data.password);
      }
      Toast.show({ type: 'success', text1: t('share.create.linkGenerated') });
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || error.response?.data?.error || t('share.create.createFailed'));
    },
  });

  const handleCreate = () => {
    let defaultTitle = '';
    const data: any = { type: shareType, expiresIn, description: description.trim() || undefined };

    if (password.trim()) {
      data.password = password.trim();
    }

    switch (shareType) {
      case 'ALL':
        defaultTitle = t('share.typeAll');
        break;
      case 'COLLECTION':
        if (selectedCollections.length === 0) {
          Alert.alert(t('common.hint'), t('share.create.pleaseSelectCollection'));
          return;
        }
        defaultTitle = t('share.create.collectionShare', { count: selectedCollections.length });
        data.collectionIds = selectedCollections;
        break;
      case 'LIST':
        if (selectedLists.length === 0) {
          Alert.alert(t('common.hint'), t('share.create.pleaseSelectGroup'));
          return;
        }
        defaultTitle = selectedLists.length === 1
          ? lists?.find((l) => l.id === selectedLists[0])?.name || t('share.create.groupShare')
          : t('share.create.groupsShare', { count: selectedLists.length });
        data.listIds = selectedLists;
        break;
      case 'TAG':
        if (selectedTags.length === 0) {
          Alert.alert(t('common.hint'), t('share.create.pleaseSelectTag'));
          return;
        }
        defaultTitle = selectedTags.length === 1
          ? `#${tags?.find((t) => t.id === selectedTags[0])?.name}` || t('share.create.tagShare')
          : t('share.create.tagsShare', { count: selectedTags.length });
        data.tagIds = selectedTags;
        break;
    }

    data.title = shareTitle.trim() || defaultTitle;
    createMutation.mutate(data);
  };

  const copyLink = async () => {
    if (generatedLink) {
      try {
        await Share.share({ message: generatedLink });
      } catch (e) {
        Toast.show({ type: 'info', text1: t('share.linkCopied') + ' ' + generatedLink, visibilityTime: 5000 });
      }
    }
  };

  const toggleList = (listId: string) => {
    setSelectedLists(prev =>
      prev.includes(listId)
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const toggleCollection = (collectionId: string) => {
    setSelectedCollections(prev =>
      prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    );
  };

  const getPlatformIconLocal = (platform: string) => {
    return getPlatformIcon(platform) || 'link';
  };

  const filteredCollections = (collections || []).filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const shareOptions = [
    { type: 'ALL' as ShareType, label: t('share.create.allCollections'), icon: 'albums', desc: t('share.create.shareAll') },
    { type: 'COLLECTION' as ShareType, label: t('share.create.collection'), icon: 'bookmark', desc: t('share.create.multiSelectCollections') },
    { type: 'LIST' as ShareType, label: t('share.create.group'), icon: 'folder-open', desc: t('share.create.multiSelectGroups') },
    { type: 'TAG' as ShareType, label: t('share.create.tag'), icon: 'pricetag', desc: t('share.create.multiSelectTags') },
  ];

  const expiresOptions: { value: ExpiresIn; label: string }[] = [
    { value: '1h', label: t('share.create.1hour') },
    { value: '24h', label: t('share.create.24hours') },
    { value: '1w', label: t('share.create.7days') },
    { value: 'never', label: t('share.create.forever') },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Share Title */}
      <View style={{ backgroundColor: colors.card, padding: 16, marginBottom: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{t('share.create.shareName')}</Text>
        <TextInput
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginTop: 8, color: colors.text, backgroundColor: colors.inputBg }}
          placeholder={t('share.create.shareNamePlaceholder')}
          placeholderTextColor={colors.textTertiary}
          value={shareTitle}
          onChangeText={setShareTitle}
          maxLength={100}
        />
      </View>

      <View style={{ backgroundColor: colors.card, padding: 16, marginBottom: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{t('share.create.selectRange')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {shareOptions.map((option) => (
            <TouchableOpacity
              key={option.type}
              style={{
                width: '23%',
                alignItems: 'center',
                padding: 12,
                borderRadius: 12,
                backgroundColor: shareType === option.type ? colors.primaryBg : colors.secondaryBg,
                borderWidth: 2,
                borderColor: shareType === option.type ? colors.primary : 'transparent',
              }}
              onPress={() => {
                setShareType(option.type);
                setSelectedLists([]);
                setSelectedTags([]);
                setSelectedCollections([]);
                setSearchQuery('');
              }}
            >
              <Ionicons
                name={option.icon as any}
                size={24}
                color={shareType === option.type ? colors.primary : colors.textSecondary}
              />
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: shareType === option.type ? colors.primary : colors.textSecondary,
                  fontWeight: shareType === option.type ? '600' : 'normal',
                }}
              >
                {option.label}
              </Text>
              <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 2 }}>{option.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Multi-select Collections */}
      {shareType === 'COLLECTION' && (
        <View style={{ backgroundColor: colors.card, padding: 16, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{t('share.create.selectCollections')}</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>{t('share.create.selectedCount', { count: selectedCollections.length })}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondaryBg, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 }}>
            <Ionicons name="search" size={18} color={colors.textTertiary} style={{ marginRight: 8 }} />
            <TextInput
              style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: colors.text }}
              placeholder={t('share.create.searchCollections')}
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={{ gap: 8 }}>
            {filteredCollections.length === 0 ? (
              <Text style={{ textAlign: 'center', color: colors.textTertiary, paddingVertical: 32 }}>
                {searchQuery ? t('share.create.noMatchCollections') : t('share.create.noCollections')}
              </Text>
            ) : (
              filteredCollections.map((collection) => (
                <TouchableOpacity
                  key={collection.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: selectedCollections.includes(collection.id) ? colors.selectedBg : colors.secondaryBg,
                    gap: 12,
                  }}
                  onPress={() => toggleCollection(collection.id)}
                >
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: selectedCollections.includes(collection.id) ? colors.primary : colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selectedCollections.includes(collection.id) ? colors.primary : 'transparent',
                  }}>
                    {selectedCollections.includes(collection.id) && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                  <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons
                      name={getPlatformIconLocal(collection.platform) as any}
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }} numberOfLines={1}>
                      {collection.title}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>{getPlatformName(collection.platform)}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      )}

      {/* Multi-select Groups */}
      {shareType === 'LIST' && (
        <View style={{ backgroundColor: colors.card, padding: 16, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{t('share.create.selectGroups')}</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>{t('share.create.selectedCount', { count: selectedLists.length })}</Text>
          </View>
          <View style={{ gap: 8 }}>
            {lists?.map((list) => {
              const indentWidth = (list.depth || 0) * 16;
              return (
                <TouchableOpacity
                  key={list.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: selectedLists.includes(list.id) ? colors.selectedBg : colors.secondaryBg,
                    gap: 12,
                    marginLeft: indentWidth,
                  }}
                  onPress={() => toggleList(list.id)}
                >
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: selectedLists.includes(list.id) ? colors.primary : colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selectedLists.includes(list.id) ? colors.primary : 'transparent',
                  }}>
                    {selectedLists.includes(list.id) && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                  <Ionicons
                    name="folder-open"
                    size={18}
                    color={selectedLists.includes(list.id) ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: selectedLists.includes(list.id) ? colors.primary : colors.text,
                      fontWeight: selectedLists.includes(list.id) ? '500' : 'normal',
                    }}
                    numberOfLines={1}
                  >
                    {getListPathDisplayName(list as any, t)}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.textTertiary }}>({list.totalCollectionCount || list.collectionCount})</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Multi-select Tags */}
      {shareType === 'TAG' && (
        <View style={{ backgroundColor: colors.card, padding: 16, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{t('share.create.selectTags')}</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>{t('share.create.selectedCount', { count: selectedTags.length })}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {tags?.map((tag) => (
              <TouchableOpacity
                key={tag.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor: selectedTags.includes(tag.id) ? colors.primary : colors.secondaryBg,
                  gap: 4,
                }}
                onPress={() => toggleTag(tag.id)}
              >
                {selectedTags.includes(tag.id) && (
                  <Ionicons name="checkmark" size={14} color="#fff" style={{ marginRight: 4 }} />
                )}
                <Text style={{ fontSize: 14, color: selectedTags.includes(tag.id) ? '#fff' : colors.textSecondary }}>
                  #{tag.name}
                </Text>
                <Text style={{ fontSize: 12, color: selectedTags.includes(tag.id) ? 'rgba(255,255,255,0.7)' : colors.textTertiary }}>
                  ({tag.collectionCount})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Advanced Settings */}
      <View style={{ backgroundColor: colors.card, padding: 16, marginBottom: 8 }}>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} onPress={() => setShowAdvanced(!showAdvanced)}>
          <Ionicons name={showAdvanced ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textSecondary} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{t('share.create.advancedSettings')}</Text>
        </TouchableOpacity>
        {showAdvanced && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textSecondary, marginBottom: 8 }}>{t('share.create.validity')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {expiresOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: expiresIn === opt.value ? colors.primary : colors.secondaryBg }}
                  onPress={() => setExpiresIn(opt.value)}
                >
                  <Text style={{ fontSize: 14, color: expiresIn === opt.value ? '#fff' : colors.textSecondary, fontWeight: expiresIn === opt.value ? '600' : 'normal' }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textSecondary, marginBottom: 8 }}>{t('share.create.accessPassword')}</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12, color: colors.text, backgroundColor: colors.inputBg }}
              placeholder={t('share.create.passwordPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              maxLength={20}
            />

            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textSecondary, marginBottom: 8 }}>{t('share.create.remark')}</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 4, color: colors.text, backgroundColor: colors.inputBg, height: 80, textAlignVertical: 'top' }}
              placeholder={t('share.create.remarkPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={1000}
            />
            <Text style={{ textAlign: 'right', color: colors.textTertiary, fontSize: 12 }}>{description.length}/1000</Text>
          </View>
        )}
      </View>

      {generatedLink ? (
        <View style={{ backgroundColor: colors.card, margin: 16, padding: 20, borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 4 }}>{t('share.create.linkGenerated')}</Text>
          {password && (
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>{t('share.create.passwordSet')}</Text>
          )}
          {expiresIn !== 'never' && (
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>
              {t('share.create.validityPeriod', { period: expiresOptions.find(o => o.value === expiresIn)?.label || '' })}
            </Text>
          )}
          <View style={{ backgroundColor: colors.secondaryBg, padding: 12, borderRadius: 8, width: '100%', marginBottom: 16, marginTop: 12 }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }} numberOfLines={2}>
              {generatedLink}
            </Text>
          </View>
          {returnedPassword && (
            <View style={{ backgroundColor: colors.primaryBg, padding: 12, borderRadius: 8, width: '100%', marginBottom: 12, borderWidth: 1, borderColor: colors.warning }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ionicons name="key" size={16} color={colors.warning} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.warning }}>{t('share.create.accessPasswordLabel')}</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, letterSpacing: 2, textAlign: 'center', paddingVertical: 4 }}>
                {returnedPassword}
              </Text>
              <Text style={{ fontSize: 11, color: colors.warning, textAlign: 'center', marginTop: 4 }}>
                {t('share.create.viewPasswordAnytime')}
              </Text>
            </View>
          )}
          <TouchableOpacity style={{ backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginBottom: 12 }} onPress={copyLink}>
            <Ionicons name="copy" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('share.create.copyLink')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ paddingVertical: 12 }} onPress={() => navigation.goBack()}>
            <Text style={{ color: colors.textSecondary, fontSize: 15 }}>{t('share.create.done')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={{ backgroundColor: colors.primary, margin: 16, padding: 16, borderRadius: 8, alignItems: 'center' }}
          onPress={handleCreate}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('share.create.generateLink')}</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
