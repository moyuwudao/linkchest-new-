'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useI18n, getListDisplayName } from '@/lib/i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getPlatformName, getPlatformColor, getPlatformIcon, isPlatformValid } from '@/lib/platforms'
import { isValidUrl, parseShareText, parseUrlPlatform } from '@/lib/utils'
import CoverEditor from '@/components/CoverEditor'
import StarRating from '@/components/StarRating'
import { PAGE_TYPES, DEFAULT_PAGE_TYPE, getPageTypeConfig, PageTypeIcon } from '@/lib/pageTypes'

type CollectionFormMode = 'add' | 'edit'

interface Tag {
  id: string
  name: string
  collectionCount?: number
}

interface ListItem {
  id: string
  name: string
  parentId: string | null
  collectionCount: number
  totalCollectionCount?: number
  isDefault?: boolean
  depth?: number
  path?: { id: string; name: string; isDefault?: boolean }[]
  pathName?: string | null
  hasChildren?: boolean
  children?: ListItem[]
}

interface Collection {
  id: string
  url: string
  title: string
  coverImage?: string
  platform: string
  note?: string
  tags: Tag[]
  lists: ListItem[]
  rating?: number | null
  pageType?: string
  createdAt: string
}

interface Props {
  mode: CollectionFormMode
  preselectedTagId?: string
  preselectedListId?: string
}

export default function CollectionForm({ mode, preselectedTagId, preselectedListId }: Props) {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const isAdd = mode === 'add'
  const isEdit = mode === 'edit'
  const collectionId = isEdit ? (params.id as string) : undefined

  const initialUrl = searchParams?.get('url') || ''

  // 表单状态
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [platform, setPlatform] = useState('other')
  const [note, setNote] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>(
    isAdd ? (preselectedTagId ? [preselectedTagId] : []) : []
  )
  const [selectedListIds, setSelectedListIds] = useState<string[]>(
    preselectedListId ? [preselectedListId] : []
  )
  const [selectedPageType, setSelectedPageType] = useState<string>(DEFAULT_PAGE_TYPE)
  const [rating, setRating] = useState<number | null>(null)
  const [expandedListIds, setExpandedListIds] = useState<Set<string>>(new Set())

  // UI状态
  const [tagSectionExpanded, setTagSectionExpanded] = useState(false)
  const [groupSectionExpanded, setGroupSectionExpanded] = useState(false)
  const [pageTypeSectionExpanded, setPageTypeSectionExpanded] = useState(false)

  const [newTagModalVisible, setNewTagModalVisible] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newListModalVisible, setNewListModalVisible] = useState(false)
  const [newListName, setNewListName] = useState('')

  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [parsePhase, setParsePhase] = useState('')

  const [duplicateWarning, setDuplicateWarning] = useState<any>(null)
  const [titleDuplicateWarning, setTitleDuplicateWarning] = useState<any>(null)

  const titleCheckTimer = useRef<NodeJS.Timeout | null>(null)

  // 获取标签列表
  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await api.get('/tags')
      return response.data.data || []
    },
  })

  // 获取分组列表（扁平列表）
  const { data: listsData } = useQuery({
    queryKey: ['lists', 'flat'],
    queryFn: async () => {
      const response = await api.get('/lists/flat')
      return response.data.data || []
    },
  })

  // 编辑模式：加载已有数据
  const { data: collection, isLoading: isLoadingCollection } = useQuery({
    queryKey: ['collection', collectionId],
    queryFn: async () => {
      if (!collectionId) return null
      const response = await api.get(`/collections/${collectionId}`)
      return response.data.data || response.data
    },
    enabled: isEdit && !!collectionId,
  })

  // 新增模式：读取用户设置
  const { data: userSettings } = useQuery({
    queryKey: ['users', 'settings'],
    queryFn: async () => {
      if (isEdit) return null
      const response = await api.get('/users/settings')
      return response.data?.data
    },
    enabled: isAdd,
  })

  useEffect(() => {
    if (isEdit && collection) {
      setUrl(collection.url || '')
      setTitle(collection.title || '')
      setCoverImage(collection.coverImage || '')
      setPlatform(collection.platform || 'other')
      setNote(collection.note || '')
      setSelectedTags(collection.tags?.map((tg: Tag) => tg.id) || [])
      setSelectedListIds(collection.lists?.map((l: ListItem) => l.id) || [])
      setRating(collection.rating ?? null)
      setSelectedPageType(collection.pageType || DEFAULT_PAGE_TYPE)
    }
  }, [isEdit, collection])

  useEffect(() => {
    if (userSettings && !preselectedListId && !preselectedTagId) {
      if (userSettings.defaultListId) {
        setSelectedListIds([userSettings.defaultListId])
      }
      if (userSettings.defaultTagIds?.length) {
        setSelectedTags(userSettings.defaultTagIds)
      }
    }
  }, [userSettings, preselectedListId, preselectedTagId])

  useEffect(() => {
    if (listsData && selectedListIds.length === 0) {
      const defaultList = listsData.find((l: any) => l.isDefault)
      if (defaultList) {
        setSelectedListIds([defaultList.id])
      } else if (listsData.length > 0) {
        setSelectedListIds([listsData[0].id])
      }
    }
  }, [listsData, selectedListIds.length])

  useEffect(() => {
    if (isAdd && initialUrl) {
      setUrl(initialUrl)
      parseUrl(initialUrl, true)
    }
  }, [isAdd, initialUrl])

  // 新增收藏
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/collections', data)
      return response.data.data || response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      queryClient.invalidateQueries({ queryKey: ['lists'] })
      queryClient.invalidateQueries({ queryKey: ['quota'] })
      router.push('/')
    },
    onError: (error: any) => {
      console.error('Create failed:', error)
      alert(t('add.saveFailed') || error.message)
    },
  })

  // 更新收藏
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put(`/collections/${collectionId}`, data)
      return response.data.data || response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] })
      router.push('/')
    },
    onError: (error: any) => {
      console.error('Update failed:', error)
      alert(t('edit.saveFailed') || error.message)
    },
  })

  // 删除收藏
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/collections/${collectionId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      queryClient.invalidateQueries({ queryKey: ['lists'] })
      queryClient.invalidateQueries({ queryKey: ['quota'] })
      router.push('/')
    },
    onError: (error: any) => {
      console.error('Delete failed:', error)
      alert(t('edit.deleteFailed') || error.message)
    },
  })

  // 创建标签
  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.post('/tags', { name })
      return response.data.data || response.data
    },
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      setSelectedTags([...selectedTags, newTag.id])
      setNewTagModalVisible(false)
      setNewTagName('')
    },
  })

  // 创建分组
  const createListMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.post('/lists', { name })
      return response.data.data || response.data
    },
    onSuccess: (newList) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] })
      setSelectedListIds([newList.id])
      setNewListModalVisible(false)
      setNewListName('')
    },
  })

  // 解析URL
  const parseUrl = useCallback(async (inputUrl: string, auto = false) => {
    if (!inputUrl.trim()) return

    setParsing(true)
    setParseError('')
    setDuplicateWarning(null)
    setTitleDuplicateWarning(null)

    try {
      setParsePhase(t('add.parsingShareText'))
      const shareTextParseResult = await parseShareText(inputUrl)
      if (shareTextParseResult.isShareText && shareTextParseResult.url) {
        inputUrl = shareTextParseResult.url
      }

      if (!isValidUrl(inputUrl)) {
        setParseError(t('add.parseFailed'))
        setParsing(false)
        return
      }

      setParsePhase(t('add.resolvingShortLink'))

      const parseData = { url: inputUrl }
      const parseResponse = await api.post('/collections/parse', parseData)
      const parsed = parseResponse.data.data

      if (parsed.url) setUrl(parsed.url)
      if (parsed.title) setTitle(parsed.title)
      if (parsed.platform) setPlatform(parsed.platform)
      if (parsed.coverImage) setCoverImage(parsed.coverImage)

      if (parsed.duplicateWarning) {
        setDuplicateWarning(parsed.duplicateWarning)
      }

      setParsing(false)
    } catch (err: any) {
      console.error('Parse failed:', err)
      setParseError(t('add.parseFailed'))
      setParsing(false)
    }
  }, [t])

  // 标题变化时检测重复
  useEffect(() => {
    if (isAdd && title.trim()) {
      if (titleCheckTimer.current) clearTimeout(titleCheckTimer.current)
      titleCheckTimer.current = setTimeout(async () => {
        try {
          const response = await api.get('/collections/check-duplicate', {
            params: { title: title.trim() },
          })
          if (response.data.data?.duplicate) {
            setTitleDuplicateWarning(response.data.data)
          } else {
            setTitleDuplicateWarning(null)
          }
        } catch {
          // ignore
        }
      }, 500)
    }
    return () => {
      if (titleCheckTimer.current) clearTimeout(titleCheckTimer.current)
    }
  }, [title, isAdd])

  // 保存收藏
  const handleSave = () => {
    if (!url.trim() || !title.trim() || selectedListIds.length === 0) {
      alert(t('add.pleaseEnterValidLink') || '请填写完整信息')
      return
    }

    const data: any = {
      url,
      title,
      coverImage,
      platform,
      note: note.trim() || null,
      tagIds: selectedTags,
      listIds: selectedListIds,
    }

    // 只发送有效的 rating（0.5-5 之间）
    if (rating !== null && rating !== undefined && rating >= 0.5 && rating <= 5) {
      data.rating = rating
    }

    // 只发送有效的 pageType
    if (selectedPageType && selectedPageType.trim() !== '') {
      data.pageType = selectedPageType
    }

    if (isAdd) {
      createMutation.mutate(data)
    } else {
      updateMutation.mutate(data)
    }
  }

  // 删除收藏
  const handleDelete = () => {
    if (confirm(t('edit.deleteConfirm'))) {
      deleteMutation.mutate()
    }
  }

  // 切换分组展开/折叠
  const toggleListExpand = (listId: string) => {
    setExpandedListIds(prev => {
      const next = new Set(prev)
      if (next.has(listId)) {
        next.delete(listId)
      } else {
        next.add(listId)
      }
      return next
    })
  }

  // 渲染标签选择器
  const renderTagSelector = () => (
    <div className="mb-6">
      <button
        onClick={() => setTagSectionExpanded(!tagSectionExpanded)}
        className="w-full flex items-center justify-between py-3 px-4 bg-chest-50 dark:bg-chest-800/50 rounded-lg hover:bg-chest-100 dark:hover:bg-chest-700/50 transition-colors"
      >
        <span className="font-medium text-charcoal dark:text-parchment">
          {t('add.tags')} ({selectedTags.length})
        </span>
        <span className="text-taupe dark:text-parchment/60">
          {tagSectionExpanded ? '▼' : '▶'}
        </span>
      </button>

      {tagSectionExpanded && (
        <div className="mt-3 p-4 bg-white dark:bg-chest-800 border border-chest-100 dark:border-chest-700/50 rounded-lg">
          <div className="flex flex-wrap gap-2 mb-4">
            {(tagsData || []).map((tag: Tag) => (
              <button
                key={tag.id}
                onClick={() => {
                  if (selectedTags.includes(tag.id)) {
                    setSelectedTags(selectedTags.filter(id => id !== tag.id))
                  } else {
                    setSelectedTags([...selectedTags, tag.id])
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedTags.includes(tag.id)
                    ? 'bg-chest-500 text-white'
                    : 'bg-chest-100 dark:bg-chest-700 text-charcoal dark:text-parchment hover:bg-chest-200 dark:hover:bg-chest-600'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => setNewTagModalVisible(true)}
            className="text-chest-500 hover:text-chest-600 dark:text-amber-400 dark:hover:text-amber-300 text-sm font-medium"
          >
            + {t('add.createTag')}
          </button>
        </div>
      )}
    </div>
  )

  // 渲染分组选择器（树形）
  const renderListSelector = () => (
    <div className="mb-6">
      <button
        onClick={() => setGroupSectionExpanded(!groupSectionExpanded)}
        className="w-full flex items-center justify-between py-3 px-4 bg-chest-50 dark:bg-chest-800/50 rounded-lg hover:bg-chest-100 dark:hover:bg-chest-700/50 transition-colors"
      >
        <span className="font-medium text-charcoal dark:text-parchment">
          {t('add.addToGroup')}{' '}
          {selectedListIds.length > 0 && listsData && (
            <span className="text-chest-500 dark:text-amber-400 ml-1">
              ({(() => {
                const foundList = listsData.find((l: ListItem) => selectedListIds.includes(l.id))
                return foundList ? getListDisplayName(foundList, t) : ''
              })()})
            </span>
          )}
        </span>
        <span className="text-taupe dark:text-parchment/60">
          {groupSectionExpanded ? '▼' : '▶'}
        </span>
      </button>

      {groupSectionExpanded && (
        <div className="mt-3 p-4 bg-white dark:bg-chest-800 border border-chest-100 dark:border-chest-700/50 rounded-lg">
          <div className="space-y-1">
            {renderListTree(listsData || [])}
          </div>
          <button
            onClick={() => setNewListModalVisible(true)}
            className="mt-4 text-chest-500 hover:text-chest-600 dark:text-amber-400 dark:hover:text-amber-300 text-sm font-medium"
          >
            + {t('add.createGroup')}
          </button>
        </div>
      )}
    </div>
  )

  // 渲染分组树
  const renderListTree = (lists: ListItem[], depth: number = 0) => {
    return lists.map((list: ListItem) => (
      <div key={list.id}>
        <div
          style={{ paddingLeft: `${depth * 16}px` }}
          className="flex items-center gap-2 py-2"
        >
          {list.hasChildren && (
            <button
              onClick={() => toggleListExpand(list.id)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {expandedListIds.has(list.id) ? '▼' : '▶'}
            </button>
          )}
          {!list.hasChildren && <span className="w-4"></span>}
          <button
            onClick={() => setSelectedListIds([list.id])}
            className={`flex-1 text-left px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedListIds.includes(list.id)
                ? 'bg-chest-500 text-white'
                : 'bg-chest-100 dark:bg-chest-700 text-charcoal dark:text-parchment hover:bg-chest-200 dark:hover:bg-chest-600'
            }`}
          >
            {getListDisplayName(list, t)}
          </button>
        </div>
        {list.hasChildren && expandedListIds.has(list.id) && list.children && (
          <div className="ml-4">{renderListTree(list.children, depth + 1)}</div>
        )}
      </div>
    ))
  }

  // 渲染页面类型选择器
  const renderPageTypeSelector = () => (
    <div className="mb-6">
      <button
        onClick={() => setPageTypeSectionExpanded(!pageTypeSectionExpanded)}
        className="w-full flex items-center justify-between py-3 px-4 bg-chest-50 dark:bg-chest-800/50 rounded-lg hover:bg-chest-100 dark:hover:bg-chest-700/50 transition-colors"
      >
        <span className="font-medium text-charcoal dark:text-parchment">
          {t('collection.pageType')} - {t(`collection.pageType${selectedPageType.charAt(0).toUpperCase() + selectedPageType.slice(1)}`)}
        </span>
        <span className="text-taupe dark:text-parchment/60">
          {pageTypeSectionExpanded ? '▼' : '▶'}
        </span>
      </button>

      {pageTypeSectionExpanded && (
        <div className="mt-3 p-4 bg-white dark:bg-chest-800 border border-chest-100 dark:border-chest-700/50 rounded-lg">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PAGE_TYPES.map((pt) => {
              const label = t(`collection.pageType${pt.value.charAt(0).toUpperCase() + pt.value.slice(1)}`)
              return (
                <button
                  key={pt.value}
                  onClick={() => setSelectedPageType(pt.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPageType === pt.value
                      ? 'bg-chest-500 text-white'
                      : 'bg-chest-100 dark:bg-chest-700 text-charcoal dark:text-parchment hover:bg-chest-200 dark:hover:bg-chest-600'
                  }`}
                >
                  <PageTypeIcon type={pt.value} size={20} className="w-5 h-5" />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  if (isEdit && isLoadingCollection) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-chest-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-center mb-6">
        <h1 className="text-2xl font-bold text-charcoal dark:text-parchment">
          {isAdd ? t('add.title') : t('edit.title')}
        </h1>
      </div>

      <div className="space-y-6">
        {/* URL输入 */}
        <div className="p-4 bg-white dark:bg-chest-800 border border-chest-100 dark:border-chest-700/50 rounded-xl">
          <label className="block text-sm font-medium mb-2 text-charcoal dark:text-parchment">
            {t('add.linkOrShareText')}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('add.pasteLinkPlaceholder')}
              className="flex-1 px-4 py-2 border border-chest-200 dark:border-chest-600 rounded-lg bg-parchment/20 dark:bg-chest-700/30 text-charcoal dark:text-parchment focus:outline-none focus:ring-2 focus:ring-chest-500"
              disabled={parsing}
            />
            <button
              onClick={() => parseUrl(url)}
              disabled={parsing || !url.trim()}
              className="px-4 py-2 bg-chest-500 text-white rounded-lg hover:bg-chest-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {parsing ? t('common.loading') : t('add.reParse')}
            </button>
          </div>
          {parsing && (
            <p className="text-sm text-taupe dark:text-parchment/60 mt-2">{parsePhase}</p>
          )}
          {parseError && (
            <p className="text-sm text-rust mt-2">{parseError}</p>
          )}
          {duplicateWarning && (
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 rounded-lg">
              <p className="text-amber-800 dark:text-amber-200 text-sm">
                {t('add.duplicateWarning', { title: duplicateWarning.title })}
              </p>
            </div>
          )}
          {titleDuplicateWarning && (
            <div className="mt-3 p-3 bg-chest-500/5 dark:bg-amber-400/10 border border-chest-200 dark:border-amber-400/30 rounded-lg">
              <p className="text-chest-700 dark:text-amber-200 text-sm">
                {t('add.titleDuplicateWarning', { title: titleDuplicateWarning.title })}
              </p>
            </div>
          )}
        </div>

        {/* 标题输入 */}
        <div className="p-4 bg-white dark:bg-chest-800 border border-chest-100 dark:border-chest-700/50 rounded-xl">
          <label className="block text-sm font-medium mb-2 text-charcoal dark:text-parchment">
            {t('add.titleField')}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('add.enterTitle')}
            className="w-full px-4 py-2 border border-chest-200 dark:border-chest-600 rounded-lg bg-parchment/20 dark:bg-chest-700/30 text-charcoal dark:text-parchment focus:outline-none focus:ring-2 focus:ring-chest-500"
          />
        </div>

        {/* 封面编辑器 */}
        <div className="p-4 bg-white dark:bg-chest-800 border border-chest-100 dark:border-chest-700/50 rounded-xl">
          <label className="block text-sm font-medium mb-2 text-charcoal dark:text-parchment">
            {t('add.coverImage')}
          </label>
          <CoverEditor
            value={coverImage}
            onChange={setCoverImage}
            platform={platform}
            title={title}
            url={url}
          />
        </div>

        {/* 备注 */}
        <div className="p-4 bg-white dark:bg-chest-800 border border-chest-100 dark:border-chest-700/50 rounded-xl">
          <label className="block text-sm font-medium mb-2 text-charcoal dark:text-parchment">
            {t('add.noteField')}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('add.addNote')}
            maxLength={100}
            rows={3}
            className="w-full px-4 py-2 border border-chest-200 dark:border-chest-600 rounded-lg bg-parchment/20 dark:bg-chest-700/30 text-charcoal dark:text-parchment focus:outline-none focus:ring-2 focus:ring-chest-500 resize-none"
          />
          <p className="text-xs text-taupe/60 dark:text-parchment/40 text-right mt-1">{note.length}/100</p>
        </div>

        {/* 评分 */}
        <div className="p-4 bg-white dark:bg-chest-800 border border-chest-100 dark:border-chest-700/50 rounded-xl">
          <label className="block text-sm font-medium mb-2 text-charcoal dark:text-parchment">
            {t('collection.detail.rating')}
          </label>
          <StarRating
            value={rating}
            onChange={setRating}
            size={24}
          />
        </div>

        {/* 标签选择 */}
        {renderTagSelector()}

        {/* 分组选择 */}
        {renderListSelector()}

        {/* 页面类型选择 */}
        {renderPageTypeSelector()}

        {/* 操作按钮 */}
        <div className="flex gap-4 pt-4">
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="px-6 py-3 bg-rust text-white rounded-lg hover:bg-rust/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {deleteMutation.isPending ? t('common.loading') : t('edit.delete')}
            </button>
          )}
          <div className="flex-1"></div>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-chest-100 dark:bg-chest-700 text-charcoal dark:text-parchment rounded-lg hover:bg-chest-200 dark:hover:bg-chest-600 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-6 py-3 bg-chest-500 text-white rounded-lg hover:bg-chest-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createMutation.isPending || updateMutation.isPending
              ? t('common.loading')
              : isAdd ? t('add.saveCollection') : t('edit.save')}
          </button>
        </div>
      </div>

      {/* 新建标签模态框 */}
      {newTagModalVisible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-chest-800 rounded-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-medium mb-4 text-charcoal dark:text-parchment">{t('add.createTag')}</h3>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder={t('add.tagNamePlaceholder')}
              className="w-full px-4 py-2 border border-chest-200 dark:border-chest-600 rounded-lg mb-4 bg-parchment/20 dark:bg-chest-700/30 text-charcoal dark:text-parchment focus:outline-none focus:ring-2 focus:ring-chest-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (newTagName.trim()) createTagMutation.mutate(newTagName.trim())
                } else if (e.key === 'Escape') {
                  setNewTagModalVisible(false)
                  setNewTagName('')
                }
              }}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setNewTagModalVisible(false)
                  setNewTagName('')
                }}
                className="px-4 py-2 bg-chest-100 dark:bg-chest-700 text-charcoal dark:text-parchment rounded-lg hover:bg-chest-200 dark:hover:bg-chest-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  if (newTagName.trim()) createTagMutation.mutate(newTagName.trim())
                }}
                disabled={!newTagName.trim()}
                className="px-4 py-2 bg-chest-500 text-white rounded-lg hover:bg-chest-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新建分组模态框 */}
      {newListModalVisible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-chest-800 rounded-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-medium mb-4 text-charcoal dark:text-parchment">{t('add.createGroup')}</h3>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder={t('add.groupNamePlaceholder')}
              className="w-full px-4 py-2 border border-chest-200 dark:border-chest-600 rounded-lg mb-4 bg-parchment/20 dark:bg-chest-700/30 text-charcoal dark:text-parchment focus:outline-none focus:ring-2 focus:ring-chest-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (newListName.trim()) createListMutation.mutate(newListName.trim())
                } else if (e.key === 'Escape') {
                  setNewListModalVisible(false)
                  setNewListName('')
                }
              }}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setNewListModalVisible(false)
                  setNewListName('')
                }}
                className="px-4 py-2 bg-chest-100 dark:bg-chest-700 text-charcoal dark:text-parchment rounded-lg hover:bg-chest-200 dark:hover:bg-chest-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  if (newListName.trim()) createListMutation.mutate(newListName.trim())
                }}
                disabled={!newListName.trim()}
                className="px-4 py-2 bg-chest-500 text-white rounded-lg hover:bg-chest-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
