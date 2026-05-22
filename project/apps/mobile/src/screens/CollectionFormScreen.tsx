import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '../lib/react-query';
import { api } from '../lib/api';
import { getPlatformName, getPlatformColor, getPlatformIcon } from '../lib/platforms';
import { useThemeStore } from '../store/theme';
import { useI18n, getListDisplayName, getListPathDisplayName } from '../lib/i18n';
import { logEvent } from '../lib/analytics';
import CoverEditor from '../components/CoverEditor';
import StarRating from '../components/StarRating';
import { PAGE_TYPES, DEFAULT_PAGE_TYPE, getPageTypeConfig } from '../lib/pageTypes';

type CollectionFormMode = 'quickAdd' | 'add' | 'edit';

type CollectionFormRouteProp = RouteProp<{
  CollectionForm: {
    mode: CollectionFormMode;
    id?: string;
    url?: string;
    title?: string;
    tagId?: string;
    listId?: string;
  };
}, 'CollectionForm'>;

interface Tag {
  id: string;
  name: string;
  collectionCount?: number;
}

interface ListItem {
  id: string;
  name: string;
  parentId: string | null;
  collectionCount: number;
  totalCollectionCount?: number;
  isDefault?: boolean;
  depth?: number;
  path?: { id: string; name: string; isDefault?: boolean }[];
  pathName?: string | null;
  hasChildren?: boolean;
}

interface UserSettings {
  shareMode: string;
  autoDetectLinkMode: string;
  coverStrategyOrder: string[];
  defaultListId: string | null;
  defaultTagIds: string[];
}

export default function CollectionFormScreen() {
  const route = useRoute<CollectionFormRouteProp>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const colors = useThemeStore(s => s.colors);
  const { t } = useI18n();

  const mode = route.params?.mode || 'add';
  const collectionId = route.params?.id;
  const initialUrl = route.params?.url || '';
  const initialTitle = route.params?.title || '';
  const preTagId = route.params?.tagId;
  const preListId = route.params?.listId;

  const isQuickAdd = mode === 'quickAdd';
  const isAdd = mode === 'add';
  const isEdit = mode === 'edit';

  const [url, setUrl] = useState(isEdit ? '' : initialUrl);
  const [title, setTitle] = useState(isEdit ? '' : initialTitle);
  const [coverImage, setCoverImage] = useState('');
  const [platform, setPlatform] = useState('other');
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    isQuickAdd || isAdd ? (preTagId ? [preTagId] : []) : []
  );
  const [selectedList, setSelectedList] = useState<string>(
    preListId || ''
  );
  const [selectedPageType, setSelectedPageType] = useState<string>(DEFAULT_PAGE_TYPE);
  const [rating, setRating] = useState<number | null>(null);
  const [expandedListIds, setExpandedListIds] = useState<Set<string>>(new Set());

  const [tagSectionExpanded, setTagSectionExpanded] = useState(false);
  const [groupSectionExpanded, setGroupSectionExpanded] = useState(false);
  const [pageTypeSectionExpanded, setPageTypeSectionExpanded] = useState(false);

  const [newTagModalVisible, setNewTagModalVisible] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newListModalVisible, setNewListModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');

  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parsePhase, setParsePhase] = useState('');

  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [titleDuplicateWarning, setTitleDuplicateWarning] = useState<any>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const [userSettings, setUserSettings] = useState<UserSettings>({
    shareMode: 'off',
    autoDetectLinkMode: 'none',
    coverStrategyOrder: ['url', 'brand', 'ai'],
    defaultListId: null,
    defaultTagIds: [],
  });

  const titleCheckTimer = useRef<NodeJS.Timeout | null>(null);

  // 设置导航标题
  useEffect(() => {
    const titleMap = {
      quickAdd: t('quickAdd.title'),
      add: t('nav.addCollection'),
      edit: t('edit.title'),
    };
    navigation.setOptions({ title: titleMap[mode] });
  }, [mode, t]);

  // 编辑模式：加载已有数据
  const { data: collection, isLoading: isLoadingCollection } = useQuery({
    queryKey: ['collection', collectionId],
    queryFn: async () => {
      if (!collectionId) return null;
      const response = await api.get(`/collections/${collectionId}`);
      return response.data.data || response.data;
    },
    enabled: isEdit && !!collectionId,
  });

  useEffect(() => {
    if (isEdit && collection) {
      setUrl(collection.url || '');
      setTitle(collection.title || '');
      setCoverImage(collection.coverImage || '');
      setPlatform(collection.platform || 'other');
      setNote(collection.note || '');
      setSelectedTags(collection.tags?.map((tg: Tag) => tg.id) || []);
      setSelectedList(collection.lists?.[0]?.id || '');
      setRating(collection.rating ?? null);
      setSelectedPageType(collection.pageType || DEFAULT_PAGE_TYPE);
    }
  }, [isEdit, collection]);

  // 快捷添加/新增模式：读取用户设置
  useEffect(() => {
    if (!isEdit) {
      api.get('/users/settings').then(res => {
        const settings = res.data?.data;
        if (settings) {
          setUserSettings(settings);
          if (settings.defaultListId && !preListId) {
            setSelectedList(settings.defaultListId);
          }
          if (settings.defaultTagIds?.length && !preTagId) {
            setSelectedTags(settings.defaultTagIds);
          }
        }
      }).catch(() => {});
    }
  }, [isEdit]);

  // 配额检查（快捷添加/新增模式）
  const { data: quotaData } = useQuery({
    queryKey: ['quota'],
    queryFn: async () => {
      if (isEdit) return null;
      const res = await api.get('/quota');
      return res.data?.data;
    },
    enabled: !isEdit,
  });

  useEffect(() => {
    if (quotaData) {
      const usage = quotaData.usage?.collections || 0;
      const limit = quotaData.limits?.collections || 0;
      if (limit > 0 && usage >= limit) {
        setQuotaExceeded(true);
      }
    }
  }, [quotaData]);

  // 获取标签列表
  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await api.get('/tags');
      return response.data.data || response.data;
    },
  });

  // 获取分组列表
  const { data: listsData } = useQuery({
    queryKey: ['lists', 'flat'],
    queryFn: async () => {
      const response = await api.get('/lists/flat');
      return (response.data.data || []) as ListItem[];
    },
  });

  // 设置默认分组
  useEffect(() => {
    if (listsData && !selectedList) {
      const defaultList = listsData.find((l: any) => l.isDefault);
      setSelectedList(defaultList?.id || listsData[0]?.id || '');
    }
  }, [listsData, selectedList]);

  // 快捷添加模式：自动解析URL
  useEffect(() => {
    if (isQuickAdd && initialUrl) {
      parseUrl(initialUrl);
    }
  }, [isQuickAdd, initialUrl]);

  // 快捷添加模式：useFocusEffect 支持复用实例刷新
  useFocusEffect(
    useCallback(() => {
      if (!isQuickAdd) return;
      const focusedUrl = route.params?.url || '';
      const focusedTitle = route.params?.title || '';
      if (focusedUrl && focusedUrl !== url) {
        setUrl(focusedUrl);
        setTitle(focusedTitle || '');
        setCoverImage('');
        setNote('');
        setParseError('');
        setDuplicateWarning(null);
        parseUrl(focusedUrl);
      }
    }, [route.params?.url, route.params?.title])
  );

  // 新增模式：标题重名检查
  useEffect(() => {
    if (isEdit || !title.trim()) {
      setTitleDuplicateWarning(null);
      return;
    }
    if (titleCheckTimer.current) clearTimeout(titleCheckTimer.current);
    titleCheckTimer.current = setTimeout(async () => {
      try {
        const dupRes = await api.post('/collections/check-duplicate', { title: title.trim() });
        const dupData = dupRes.data.data;
        setTitleDuplicateWarning(dupData.duplicateTitle ? dupData.titleCollection : null);
      } catch { /* ignore */ }
    }, 600);
    return () => { if (titleCheckTimer.current) clearTimeout(titleCheckTimer.current); };
  }, [title, isEdit]);

  // URL 解析
  const parseUrl = useCallback(async (inputStr: string) => {
    if (!inputStr || !inputStr.trim()) {
      setParseError('');
      return;
    }
    setParsing(true);
    setParseError('');
    setParsePhase(t('common.loading'));

    try {
      const response = await api.post('/collections/smart-parse', { input: inputStr.trim() }, { timeout: 25000 });
      const data = response.data.data;

      if (!data) {
        setParseError(t('add.parseResultEmpty'));
        return;
      }

      if (response.data.steps && response.data.steps.length > 0) {
        const lastStep = response.data.steps[response.data.steps.length - 1];
        setParsePhase(typeof lastStep === 'string' ? lastStep : lastStep.step || '');
      }

      if (data.url) setUrl(data.url);
      if (data.title) setTitle(data.title);
      if (data.coverImage) setCoverImage(data.coverImage);
      if (data.platform) setPlatform(data.platform);

      if (data.url) {
        try {
          const classifyRes = await api.post('/collections/classify', { url: data.url, platform: data.platform });
          const classifyData = classifyRes.data.data;
          setSelectedPageType(classifyData.type || DEFAULT_PAGE_TYPE);
        } catch {
          setSelectedPageType(DEFAULT_PAGE_TYPE);
        }
      }

      if (!isEdit && data.duplicate) {
        setDuplicateWarning(data.duplicateCollection || data.existingCollection);
      } else {
        setDuplicateWarning(null);
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.response?.data?.error || t('add.parseFailed');
      setParseError(errMsg);
    } finally {
      setParsing(false);
      setParsePhase('');
    }
  }, [t, isEdit]);

  // 创建收藏
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/collections', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'collections' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'lists' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'tags' });
      queryClient.invalidateQueries({ queryKey: ['quota'] });
      logEvent('add_collection', { platform, mode });
      Alert.alert(t('common.success'), t('add.addedSuccess'));
      navigation.goBack();
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.response?.data?.error || t('add.addFailed');
      Alert.alert(t('common.error'), errMsg);
    },
  });

  // 更新收藏
  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/collections/${collectionId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'collections' });
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'lists' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'tags' });
      Alert.alert(t('common.success'), t('edit.saveSuccess'));
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || error.response?.data?.error || t('edit.updateFailed'));
    },
  });

  // 创建新标签
  const createTagMutation = useMutation({
    mutationFn: (name: string) => api.post('/tags', { name }),
    onSuccess: (response: any) => {
      const newTag = response.data?.data;
      if (newTag?.id) {
        setSelectedTags(prev => [...prev, newTag.id]);
        queryClient.invalidateQueries({ queryKey: ['tags'] });
      }
      setNewTagName('');
      setNewTagModalVisible(false);
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || t('edit.createTagFailed'));
    },
  });

  // 创建新分组
  const createListMutation = useMutation({
    mutationFn: (name: string) => api.post('/lists', { name }),
    onSuccess: (response: any) => {
      const newList = response.data?.data;
      if (newList?.id) {
        setSelectedList(newList.id);
        queryClient.invalidateQueries({ queryKey: ['lists'] });
      }
      setNewListName('');
      setNewListModalVisible(false);
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || t('edit.createListFailed'));
    },
  });

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const selectList = (listId: string) => {
    if (selectedList === listId) return;
    setSelectedList(listId);
  };

  const toggleListExpand = (id: string) => {
    setExpandedListIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    if (quotaExceeded) {
      Alert.alert(t('common.hint'), t('error.quotaExceeded'));
      return;
    }

    if (!url.trim()) {
      Alert.alert(t('common.hint'), isEdit ? t('edit.enterUrl') : t('add.pleaseEnterLinkAndTitle'));
      return;
    }

    if (!title.trim()) {
      Alert.alert(t('common.hint'), isEdit ? t('edit.enterTitle') : t('add.pleaseEnterLinkAndTitle'));
      return;
    }

    if (!selectedList) {
      Alert.alert(t('common.hint'), t('edit.pleaseSelectGroup'));
      return;
    }

    const data: any = {
      url: url.trim(),
      title: title.trim(),
      platform,
      tagIds: selectedTags,
      listIds: [selectedList],
      pageType: selectedPageType,
    };

    if (coverImage && coverImage.trim()) data.coverImage = coverImage.trim();
    if (note && note.trim()) data.note = note.trim();
    if (isEdit && rating !== null && rating !== undefined) data.rating = rating;

    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isLoadingCollection) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const platformColor = getPlatformColor(isEdit ? (collection?.platform || '') : platform);

  const getSelectedTagNames = () => {
    if (selectedTags.length === 0) return '';
    const names = selectedTags
      .map(tagId => tagsData?.find((tg: Tag) => tg.id === tagId)?.name)
      .filter(Boolean);
    return names.join('、');
  };

  const getSelectedListDisplay = () => {
    if (!selectedList) return '';
    const list = listsData?.find((l: any) => l.id === selectedList);
    return list ? getListPathDisplayName(list, t) : '';
  };

  const renderExpandableSection = (
    sectionTitle: string,
    expanded: boolean,
    onToggle: () => void,
    selectedText: string,
    children: React.ReactNode
  ) => (
    <View style={{ backgroundColor: colors.card, padding: 16, marginBottom: 8 }}>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{sectionTitle}</Text>
          {selectedText ? (
            <Text style={{ fontSize: 12, color: colors.primary }} numberOfLines={1}>
              ({selectedText})
            </Text>
          ) : null}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={{ marginTop: 12 }}>
          {children}
        </View>
      )}
    </View>
  );

  const renderVisibleLists = () => {
    const visibleItems: ListItem[] = [];
    const addChildren = (parentId: string | null, depth: number) => {
      const children = (listsData || []).filter((l: any) => l.parentId === parentId);
      for (const child of children) {
        visibleItems.push({ ...child, depth } as ListItem);
        if (child.hasChildren && expandedListIds.has(child.id)) {
          addChildren(child.id, depth + 1);
        }
      }
    };
    const rootItems = (listsData || []).filter((l: any) => !l.parentId);
    for (const root of rootItems) {
      visibleItems.push({ ...root, depth: 0 } as ListItem);
      if (root.hasChildren && expandedListIds.has(root.id)) {
        addChildren(root.id, 1);
      }
    }
    return visibleItems;
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} keyboardShouldPersistTaps="handled">
      {quotaExceeded && (
        <View style={{ backgroundColor: '#FFF3E0', padding: 12, margin: 16, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="alert-circle" size={20} color="#FF9500" />
          <Text style={{ fontSize: 13, color: '#E65100', flex: 1 }}>
            {t('error.quotaExceeded')}
          </Text>
        </View>
      )}

      {/* 链接地址 */}
      <View style={{ backgroundColor: colors.card, padding: 16, marginBottom: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>{t('edit.linkAddress')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, position: 'relative' }}>
            <TextInput
              style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, paddingRight: 36, fontSize: 16, color: colors.text, backgroundColor: colors.inputBg }}
              placeholder={t('edit.pasteLinkOrShareText')}
              placeholderTextColor={colors.textTertiary}
              value={url}
              onChangeText={(text) => { setUrl(text); setParseError(''); setDuplicateWarning(null); }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {url.length > 0 && (
              <TouchableOpacity
                onPress={() => { setUrl(''); setTitle(''); setCoverImage(''); setPlatform('other'); setParseError(''); setDuplicateWarning(null); }}
                style={{ position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', width: 28 }}
              >
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={() => parseUrl(url)}
            disabled={parsing || !url}
            style={{ padding: 10, borderRadius: 8, backgroundColor: parsing || !url ? colors.border : colors.primary + '15' }}
          >
            {parsing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name={isEdit ? 'refresh' : 'search'} size={20} color={parsing || !url ? colors.textTertiary : colors.primary} />
            )}
          </TouchableOpacity>
        </View>
        {parsing && (
          <View style={{ marginTop: 8, padding: 10, backgroundColor: colors.primaryBg, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ fontSize: 14, color: colors.primary }}>{parsePhase || t('common.loading')}</Text>
          </View>
        )}
        {parseError ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: colors.danger, paddingVertical: 4 }}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.danger }}>{parseError}</Text>
          </View>
        ) : null}
        {duplicateWarning && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: colors.warning, paddingVertical: 4 }}>
            <Ionicons name="alert-circle" size={16} color={colors.warning} />
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.warning }}>
              {t('add.duplicateWarning', { title: duplicateWarning.title || t('add.noTitle') })}
            </Text>
          </View>
        )}
        {titleDuplicateWarning && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: colors.warning, paddingVertical: 4 }}>
            <Ionicons name="alert-circle" size={16} color={colors.warning} />
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.warning }}>
              {t('add.titleDuplicateWarning', { title: titleDuplicateWarning.title || t('add.noTitle') })}{t('add.canStillSave')}
            </Text>
          </View>
        )}
      </View>

      {/* 标题 */}
      <View style={{ backgroundColor: colors.card, padding: 16, marginBottom: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>{t('edit.titleField')}</Text>
        <TextInput
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, color: colors.text, backgroundColor: colors.inputBg }}
          placeholder={t('edit.enterVideoTitle')}
          placeholderTextColor={colors.textTertiary}
          value={title}
          onChangeText={setTitle}
        />
      </View>

      {/* 平台信息（只读，自动识别） */}
      <View style={{ backgroundColor: colors.card, padding: 16, marginBottom: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>{t('edit.platformField')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, backgroundColor: platformColor + '10', borderWidth: 1, borderColor: platformColor + '30' }}>
          <Ionicons name={getPlatformIcon(platform) as any} size={20} color={platformColor} />
          <Text style={{ flex: 1, fontSize: 16, fontWeight: '500', color: platformColor }}>
            {getPlatformName(platform)}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textTertiary }}>{t('collection.autoDetected')}</Text>
        </View>
      </View>

      {/* 封面 */}
      <CoverEditor
        value={coverImage}
        onChange={setCoverImage}
        platform={platform}
        title={title}
        url={url}
        collectionId={isEdit ? collectionId : undefined}
      />

      {/* 备注 */}
      <View style={{ backgroundColor: colors.card, padding: 16, marginBottom: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>{t('edit.note')}</Text>
        <TextInput
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, color: colors.text, backgroundColor: colors.inputBg, height: 80, textAlignVertical: 'top' }}
          placeholder={t('edit.addNote')}
          placeholderTextColor={colors.textTertiary}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={100}
        />
        <Text style={{ textAlign: 'right', color: colors.textTertiary, fontSize: 12, marginTop: 4 }}>{note.length}/100</Text>
      </View>

      {/* 评分（仅编辑模式） */}
      {isEdit && (
        <View style={{ backgroundColor: colors.card, padding: 16, marginBottom: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>{t('collection.detail.rating')}</Text>
          <StarRating
            value={rating}
            onChange={setRating}
            size={32}
            allowHalf={true}
          />
        </View>
      )}

      {/* 标签 - 展开式选择 */}
      {renderExpandableSection(
        t('edit.tags'),
        tagSectionExpanded,
        () => setTagSectionExpanded(!tagSectionExpanded),
        selectedTags.length > 0 ? getSelectedTagNames() : '',
        <>
          <TouchableOpacity
            onPress={() => setNewTagModalVisible(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: colors.primary + '15',
              borderWidth: 1,
              borderColor: colors.primary + '30',
              marginBottom: 10,
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.primary }}>{t('add.createTag')}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {tagsData?.map((tag: Tag) => (
              <TouchableOpacity
                key={tag.id}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor: selectedTags.includes(tag.id) ? colors.primary : colors.filterChipBg,
                  borderWidth: 1,
                  borderColor: selectedTags.includes(tag.id) ? colors.primary : colors.border,
                }}
                onPress={() => toggleTag(tag.id)}
              >
                <Text style={{ color: selectedTags.includes(tag.id) ? '#fff' : colors.textSecondary, fontSize: 14 }}>
                  #{tag.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* 所属分组 - 展开式选择 */}
      {renderExpandableSection(
        t('edit.groupField'),
        groupSectionExpanded,
        () => setGroupSectionExpanded(!groupSectionExpanded),
        getSelectedListDisplay(),
        <>
          <TouchableOpacity
            onPress={() => setNewListModalVisible(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: colors.primary + '15',
              borderWidth: 1,
              borderColor: colors.primary + '30',
              marginBottom: 10,
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.primary }}>{t('add.createGroup')}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <TouchableOpacity
              onPress={() => {
                const allParentIds = (listsData || []).filter((l: any) => l.hasChildren).map((l: any) => l.id);
                setExpandedListIds(new Set(allParentIds));
              }}
            >
              <Text style={{ fontSize: 13, color: colors.primary }}>{t('common.expandAll')}</Text>
            </TouchableOpacity>
            <View style={{ width: 1, height: 12, backgroundColor: colors.border }} />
            <TouchableOpacity onPress={() => setExpandedListIds(new Set())}>
              <Text style={{ fontSize: 13, color: colors.primary }}>{t('common.collapseAll')}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ gap: 6 }}>
            {renderVisibleLists().map((list: ListItem) => {
              const indentWidth = (list.depth || 0) * 16;
              const hasChildren = list.hasChildren;
              const isExpanded = expandedListIds.has(list.id);
              return (
                <TouchableOpacity
                  key={list.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: selectedList === list.id ? colors.primary : colors.filterChipBg,
                    borderWidth: 1,
                    borderColor: selectedList === list.id ? colors.primary : colors.border,
                    marginLeft: indentWidth,
                  }}
                  onPress={() => selectList(list.id)}
                >
                  {hasChildren ? (
                    <TouchableOpacity
                      style={{ padding: 2, marginRight: 4 }}
                      onPress={(e) => { e.stopPropagation(); toggleListExpand(list.id); }}
                    >
                      <Ionicons
                        name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                        size={16}
                        color={selectedList === list.id ? '#fff' : colors.textSecondary}
                      />
                    </TouchableOpacity>
                  ) : (
                    <View style={{ width: 22, marginRight: 4 }} />
                  )}
                  <Text
                    style={{
                      color: selectedList === list.id ? '#fff' : colors.textSecondary,
                      fontSize: 14,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {getListPathDisplayName(list, t)}
                  </Text>
                  {selectedList === list.id && (
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* 页面类型 - 展开式选择 */}
      {renderExpandableSection(
        t('collection.filter.pageType'),
        pageTypeSectionExpanded,
        () => setPageTypeSectionExpanded(!pageTypeSectionExpanded),
        t(getPageTypeConfig(selectedPageType).labelKey),
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PAGE_TYPES.map((pt) => {
              const isActive = selectedPageType === pt.value;
              const config = getPageTypeConfig(pt.value);
              return (
                <TouchableOpacity
                  key={pt.value}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 16,
                    backgroundColor: isActive ? colors.primary : colors.filterChipBg,
                    borderWidth: 1,
                    borderColor: isActive ? colors.primary : colors.border,
                  }}
                  onPress={() => setSelectedPageType(pt.value)}
                >
                  <Ionicons name={config.icon as any} size={14} color={isActive ? '#fff' : colors.textSecondary} />
                  <Text style={{ color: isActive ? '#fff' : colors.textSecondary, fontSize: 14 }}>
                    {t(config.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* 保存按钮 */}
      <TouchableOpacity
        style={{
          backgroundColor: quotaExceeded ? colors.border : colors.primary,
          margin: 12,
          padding: 12,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 16,
          opacity: isSaving ? 0.7 : 1,
        }}
        onPress={handleSave}
        disabled={quotaExceeded || isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
            {isEdit ? t('edit.saveChanges') : t('add.saveCollection')}
          </Text>
        )}
      </TouchableOpacity>

      {/* 新增标签弹窗 */}
      <Modal
        visible={newTagModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNewTagModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 20, width: '100%', maxWidth: 320 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 }}>{t('add.createTag')}</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, color: colors.text, backgroundColor: colors.inputBg, marginBottom: 16 }}
              placeholder={t('add.tagNamePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={newTagName}
              onChangeText={setNewTagName}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: colors.secondaryBg, alignItems: 'center' }}
                onPress={() => setNewTagModalVisible(false)}
              >
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '500' }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center' }}
                onPress={() => {
                  if (newTagName.trim()) createTagMutation.mutate(newTagName.trim());
                }}
                disabled={createTagMutation.isPending || !newTagName.trim()}
              >
                {createTagMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>{t('common.confirm')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 新增分组弹窗 */}
      <Modal
        visible={newListModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNewListModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 20, width: '100%', maxWidth: 320 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 }}>{t('add.createGroup')}</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, color: colors.text, backgroundColor: colors.inputBg, marginBottom: 16 }}
              placeholder={t('add.groupNamePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: colors.secondaryBg, alignItems: 'center' }}
                onPress={() => setNewListModalVisible(false)}
              >
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '500' }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center' }}
                onPress={() => {
                  if (newListName.trim()) createListMutation.mutate(newListName.trim());
                }}
                disabled={createListMutation.isPending || !newListName.trim()}
              >
                {createListMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>{t('common.confirm')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
