import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  isLoggedIn,
  getUser,
  logout,
  setToken,
  setUser as saveUserToStorage,
  getCoverStrategyOrder,
  getServerUrl,
  getLanguage,
  getDefaultListId,
  getDefaultTagIds,
  getDefaultNote,
  getDefaultPageType,
  getCurrentServer,
  type ServerConfig,
  detectSystemLocale,
} from '../lib/storage';
import {
  createCollection,
  getUserSettings,
  getFlatLists,
  getTags,
  login,
  extractApiError,
} from '../lib/api';
import { t } from '../lib/i18n';
import { getErrorMessage } from '@linkchest/i18n';

type CoverStrategy = 'url' | 'brand' | 'ai';

// ★ 页面类型（与 web 端 pageTypes.ts 对齐）
const PAGE_TYPES: Array<{ value: string; labelKey: string }> = [
  { value: 'home', labelKey: 'pageTypeHome' },
  { value: 'detail', labelKey: 'pageTypeDetail' },
  { value: 'list', labelKey: 'pageTypeList' },
  { value: 'search', labelKey: 'pageTypeSearch' },
  { value: 'navigation', labelKey: 'pageTypeNavigation' },
  { value: 'document', labelKey: 'pageTypeDocument' },
  { value: 'download', labelKey: 'pageTypeDownload' },
  { value: 'other', labelKey: 'pageTypeOther' },
];

interface ListItem {
  id: string;
  name: string;
  parentId: string | null;
  depth?: number;
  isDefault?: boolean;
}

interface TagItem {
  id: string;
  name: string;
}

export default function Popup() {
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [lang, setLang] = useState(detectSystemLocale());

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [pageUrl, setPageUrl] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');

  const [settings, setSettings] = useState<{
    shareMode?: string;
    coverStrategyOrder?: CoverStrategy[];
    defaultListId?: string;
    defaultTagIds?: string[];
  } | null>(null);
  const [lists, setLists] = useState<ListItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [localCoverOrder, setLocalCoverOrder] = useState<CoverStrategy[]>([]);
  const [currentServer, setCurrentServer] = useState<ServerConfig | null>(null);

  const [coverStrategy, setCoverStrategy] = useState<CoverStrategy>('url');
  const [selectedListId, setSelectedListId] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedPageType, setSelectedPageType] = useState<string>('');  // '' = 自动识别
  const [note, setNote] = useState('');
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    async function init() {
      const [li, language, server] = await Promise.all([isLoggedIn(), getLanguage(), getCurrentServer()]);
      setLang(language);
      setLoggedIn(li);
      setCurrentServer(server);
      setAuthChecked(true);

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab?.url) setPageUrl(tab.url);
        if (tab?.favIconUrl) setFaviconUrl(tab.favIconUrl);

        // ★ 立即用 tab.title 兜底（不等待 content script 异步响应）
        if (tab?.title) {
          console.log('[LinkChest] set pageTitle from tab.title:', tab.title?.substring(0, 40));
          setPageTitle(tab.title);
        }

        // 向 content script 请求提取的元数据（覆盖 tab.title 以获取更精确的 og:title）
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'GET_METADATA' }, (metadata) => {
            if (chrome.runtime.lastError) {
              // content script 未注入（如 chrome:// 页面、PDF、Edge/QQ 浏览器特殊页等）
              console.log('[LinkChest] content script not available:', chrome.runtime.lastError.message);
              return;
            }
            if (metadata?.title) {
              console.log('[LinkChest] set pageTitle from content script:', metadata.title?.substring(0, 40));
              setPageTitle(metadata.title);
            }
            if (metadata?.coverImage) {
              setFaviconUrl(metadata.coverImage);
            }
          });
        }
      });

      if (li) {
        const u = await getUser();
        setUser(u);
        loadUserData();
      }
    }
    init();
  }, []);

  async function loadUserData() {
    setDataLoading(true);
    try {
      const results = await Promise.all([
        getUserSettings(),
        getFlatLists(),
        getTags(),
        getCoverStrategyOrder(),
        getDefaultListId(),
        getDefaultTagIds(),
        getDefaultNote(),
        getDefaultPageType(),
      ]);
      const s = results[0] as Awaited<ReturnType<typeof getUserSettings>>;
      const l = results[1] as Awaited<ReturnType<typeof getFlatLists>>;
      const tagList = results[2] as Awaited<ReturnType<typeof getTags>>;
      const localOrder = results[3] as Awaited<ReturnType<typeof getCoverStrategyOrder>>;
      const localListId = results[4] as Awaited<ReturnType<typeof getDefaultListId>>;
      const localTagIds = results[5] as Awaited<ReturnType<typeof getDefaultTagIds>>;
      const localNote = results[6] as Awaited<ReturnType<typeof getDefaultNote>>;
      const localPageType = results[7] as Awaited<ReturnType<typeof getDefaultPageType>>;
      setSettings(s);
      setLists(l);
      setTags(tagList);

      setLocalCoverOrder(localOrder);
      // ★ 过滤服务器返回的可能非法值（兼容历史 order 包含 'auto' 等情况）
      const validStrategies: CoverStrategy[] = ['url', 'brand', 'ai'];
      const safeOrder = (localOrder?.length ? localOrder : (s?.coverStrategyOrder || validStrategies))
        .filter((x: string): x is CoverStrategy => validStrategies.includes(x as CoverStrategy));
      const order = safeOrder.length ? safeOrder : validStrategies;
      if (order.length > 0) setCoverStrategy(order[0]);

      // ★ 默认分组：本地 → 服务器 settings → isDefault list
      // 如果本地 defaultListId 不在服务器返回的列表中（被删了），回退
      let defaultList = '';
      const validListIds = new Set(l.map((x: ListItem) => x.id));
      if (localListId && validListIds.has(localListId)) {
        defaultList = localListId;
      } else if (s?.defaultListId && validListIds.has(s.defaultListId)) {
        defaultList = s.defaultListId;
      } else {
        defaultList = l.find((item: ListItem) => item.isDefault)?.id || '';
      }
      setSelectedListId(defaultList);

      // ★ 过滤失效的默认标签（tags 列表里已不存在的 id 静默丢弃）
      const validTagIdSet = new Set(tagList.map((x: TagItem) => x.id));
      const safeDefaultTags = (localTagIds?.length ? localTagIds : (s?.defaultTagIds || []))
        .filter((id: string) => validTagIdSet.has(id));
      setSelectedTagIds(safeDefaultTags);

      // ★ 默认备注（仅本地 storage）
      setNote(localNote || '');

      // ★ 默认页面类型（仅本地 storage）
      setSelectedPageType(localPageType || '');
    } catch (e) {
      console.error('Failed to load user data', e);
    } finally {
      setDataLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await login({ email, password });
      if (res?.token) {
        await setToken(res.token);
        await saveUserToStorage(res.user || {});
        setLoggedIn(true);
        setUser(res.user || {});
        loadUserData();
      } else {
        setLoginError(t('loginError', lang));
      }
    } catch (err: any) {
      const info = extractApiError(err);
      console.error('[LinkChest] login error:', info);
      // API 错误响应: { error: "ERR_XXX", details: ... }
      // 优先通过错误码映射为本地化消息，否则显示 details/message
      const friendly = info.code
        ? getErrorMessage(info.code, lang)
        : (typeof info.details === 'string' ? info.details : info.message) || t('loginFailed', lang);
      setLoginError(friendly);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSave() {
    if (!pageUrl) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      // ★ 发送前 client-side 校验：避免无效 coverStrategy 触发 400
      const validCoverStrategies: CoverStrategy[] = ['url', 'brand', 'ai'];
      const safeCoverStrategy = validCoverStrategies.includes(coverStrategy)
        ? coverStrategy
        : 'url';

      // ★ 强制 fallback：title 为空时用 URL，避免 400 验证失败
      const safeTitle = (pageTitle && pageTitle.trim()) ? pageTitle.trim() : pageUrl;

      const payload: Record<string, unknown> = {
        url: pageUrl,
        title: safeTitle,
        coverStrategy: safeCoverStrategy,
      };
      if (note) payload.note = note;
      if (selectedTagIds.length) payload.tagIds = selectedTagIds;
      // ★ 始终发送 listIds（即使为空也用 defaultListId 兜底）
      if (selectedListId) {
        payload.listIds = [selectedListId];
      } else if (settings?.defaultListId) {
        payload.listIds = [settings.defaultListId];
        console.log('[LinkChest] selectedListId empty, using defaultListId from settings');
      }
      // ★ 页面类型（'' = 不发送，让服务器自动识别）
      if (selectedPageType) {
        payload.pageType = selectedPageType;
      }

      await createCollection(payload as Parameters<typeof createCollection>[0]);
      setSaveStatus('success');
      setSaveMessage(t('saveSuccess', lang));
      setTimeout(() => window.close(), 1200);
    } catch (err: any) {
      const info = extractApiError(err);
      console.error('[LinkChest] save error:', info);
      // 优先通过错误码映射为本地化消息
      let friendly: string;
      if (info.code) {
        friendly = getErrorMessage(info.code, lang);
        // details 是字符串时附加到友好消息后
        if (typeof info.details === 'string' && info.details && info.details !== friendly) {
          friendly = `${friendly}（${info.details}）`;
        }
        // details 是数组（express-validator 返回的 errors.array()）时取首个
        else if (Array.isArray(info.details) && info.details.length > 0) {
          const first = info.details[0];
          const path = first.path || first.param || '';
          const msg = first.msg || first.message || '';
          if (msg) {
            friendly = path ? `${friendly}（${path}: ${msg}）` : `${friendly}（${msg}）`;
          }
        }
      } else if (typeof info.details === 'string') {
        friendly = info.details;
      } else if (info.message) {
        friendly = info.message;
      } else {
        friendly = t('saveFailed', lang);
      }
      setSaveStatus('error');
      setSaveMessage(friendly);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    setLoggedIn(false);
    setUser(null);
    setSettings(null);
    setLists([]);
    setTags([]);
  }

  const coverStrategies = useMemo(() => {
    const order = localCoverOrder?.length
      ? localCoverOrder
      : (settings?.coverStrategyOrder || (['url', 'brand', 'ai'] as CoverStrategy[]));
    return order.filter((s) => ['url', 'brand', 'ai'].includes(s));
  }, [localCoverOrder, settings]);

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function adjustTextareaHeight() {
    const textarea = noteTextareaRef.current;
    if (textarea) {
      textarea.style.height = '32px';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }

  function openCollections() {
    getServerUrl().then((baseUrl) => {
      chrome.tabs.create({ url: `${baseUrl}/` });
    });
  }

  function getListDisplayName(list: ListItem): string {
    if (list.name === '__DEFAULT_LIST__' || list.name === 'default_list' || list.isDefault) {
      return t('myCollections', lang);
    }
    return list.name;
  }

  if (!authChecked || dataLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
        <span>{t('loading', lang)}</span>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="popup-container">
        <div className="popup-header">
          <img src="/icons/icon32.png" alt="LinkChest" />
          <h1>LinkChest</h1>
        </div>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>{t('email', lang)}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('password', lang)}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {loginError && (
            <div className="status-message error">{loginError}</div>
          )}
          <button type="submit" className="btn-primary" disabled={loginLoading}>
            {loginLoading ? t('loginLoading', lang) : t('login', lang)}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button
            className="link-btn"
            onClick={() => chrome.runtime.openOptionsPage()}
          >
            {t('setServerUrl', lang)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="popup-container">
      <div className="popup-header">
        <button
          className="header-link"
          onClick={openCollections}
          title={t('myCollections', lang)}
        >
          <span>{t('myCollections', lang)}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>
        <div className="header-brand">
          <img src="/icons/icon32.png" alt="LinkChest" />
          <h1>LinkChest</h1>
        </div>
        <button
          className="header-icon-btn"
          onClick={() => chrome.runtime.openOptionsPage()}
          title={t('settings', lang)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* 当前服务器提示 */}
      {currentServer && (
        <div style={{
          padding: '6px 12px',
          background: '#f0f0f0',
          borderRadius: 4,
          marginBottom: 8,
          fontSize: 12,
          color: '#666',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: currentServer.key === 'global' ? '#4CAF50' : '#FF9800',
            display: 'inline-block',
          }} />
          <span>{t('currentServer', lang)}: {currentServer.key === 'global' ? 'LinkChest' : '链藏'} ({currentServer.url})</span>
        </div>
      )}

      <div className="form-group">
        <label>{t('pageTitle', lang)}</label>
        <input
          type="text"
          value={pageTitle}
          onChange={(e) => setPageTitle(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>{t('link', lang)}</label>
        <input type="text" value={pageUrl} readOnly />
      </div>

      <div className="form-group">
        <label>{t('coverStrategy', lang)}</label>
        <div className="cover-tabs">
          {coverStrategies.map((s) => (
            <button
              key={s}
              className={`cover-tab ${coverStrategy === s ? 'active' : ''}`}
              onClick={() => setCoverStrategy(s)}
            >
              {t(s, lang)}
            </button>
          ))}
        </div>
      </div>

      {coverStrategy === 'url' && faviconUrl && (
        <img
          src={faviconUrl}
          alt="favicon"
          className="cover-preview"
          style={{ objectFit: 'contain', padding: 8 }}
        />
      )}

      {coverStrategy === 'ai' && (
        <div className="ai-hint">{t('aiHint', lang)}</div>
      )}

      <div className="form-group">
        <label>{t('group', lang)}</label>
        <select
          value={selectedListId}
          onChange={(e) => setSelectedListId(e.target.value)}
        >
          <option value="">{t('selectGroup', lang)}</option>
          {lists.map((l) => {
            const isServerDefault = !!l.isDefault || l.name === '__DEFAULT_LIST__' || l.name === 'default_list';
            const serverDefaultId = settings?.defaultListId || lists.find((x: ListItem) => x.isDefault)?.id;
            const isCurrentDefault = l.id === serverDefaultId;
            const suffix = isCurrentDefault ? ` ★ ${t('defaultList', lang)}` : (isServerDefault ? ` (${t('myCollections', lang)})` : '');
            return (
              <option key={l.id} value={l.id}>
                {'\u00A0\u00A0'.repeat(l.depth || 0)}
                {getListDisplayName(l)}{suffix}
              </option>
            );
          })}
        </select>
      </div>

      <div className="form-group">
        <label>{t('pageType', lang)}</label>
        <select
          value={selectedPageType}
          onChange={(e) => setSelectedPageType(e.target.value)}
        >
          <option value="">{t('autoDetect', lang)}</option>
          {PAGE_TYPES.map((pt) => (
            <option key={pt.value} value={pt.value}>
              {t(pt.labelKey, lang)}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>{t('tags', lang)}</label>
        <div className="tag-select">
          {tags.map((tItem) => (
            <button
              key={tItem.id}
              className={`tag-chip ${selectedTagIds.includes(tItem.id) ? 'active' : ''}`}
              onClick={() => toggleTag(tItem.id)}
            >
              {tItem.name}
            </button>
          ))}
          {/* ★ 失效标签：选中的但已不在 tags 列表中（被删了） */}
          {selectedTagIds
            .filter((id) => !tags.some((x) => x.id === id))
            .map((staleId) => (
              <button
                key={staleId}
                className="tag-chip active stale"
                title={t('listMissing', lang)}
                onClick={() => toggleTag(staleId)}
                style={{ opacity: 0.6, textDecoration: 'line-through' }}
              >
                {staleId.slice(0, 6)}
              </button>
            ))}
        </div>
      </div>

      <div className="form-group">
        <label>{t('note', lang)} <span className="char-count">{note.length}/100</span></label>
        <textarea
          ref={noteTextareaRef}
          value={note}
          onChange={(e) => {
            setNote(e.target.value.slice(0, 100));
            adjustTextareaHeight();
          }}
          onInput={adjustTextareaHeight}
          placeholder={t('optional', lang)}
          maxLength={100}
        />
      </div>

      {saveStatus !== 'idle' && (
        <div className={`status-message ${saveStatus}`}>{saveMessage}</div>
      )}

      <button
        className="btn-primary"
        onClick={handleSave}
        disabled={saving || !pageUrl}
      >
        {saving ? t('saving', lang) : t('saveToLinkchest', lang)}
      </button>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 4,
        }}
      >
        <span style={{ fontSize: 12, color: '#666' }}>
          {String(user?.nickname || user?.username || user?.email || '')}
        </span>
        <button className="link-btn" onClick={handleLogout}>
          {t('logout', lang)}
        </button>
      </div>
    </div>
  );
}
