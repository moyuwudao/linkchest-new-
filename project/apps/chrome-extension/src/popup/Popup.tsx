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
  detectSystemLocale,
} from '../lib/storage';
import {
  createCollection,
  getUserSettings,
  getFlatLists,
  getTags,
  login,
} from '../lib/api';
import { t } from '../lib/i18n';

type CoverStrategy = 'url' | 'brand' | 'ai';

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

  const [coverStrategy, setCoverStrategy] = useState<CoverStrategy>('url');
  const [selectedListId, setSelectedListId] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    async function init() {
      const [li, language] = await Promise.all([isLoggedIn(), getLanguage()]);
      setLang(language);
      setLoggedIn(li);
      setAuthChecked(true);

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab?.url) setPageUrl(tab.url);
        if (tab?.title) setPageTitle(tab.title);
        if (tab?.favIconUrl) setFaviconUrl(tab.favIconUrl);
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
      const [s, l, tagList, localOrder, localListId, localTagIds, localNote] = await Promise.all([
        getUserSettings(),
        getFlatLists(),
        getTags(),
        getCoverStrategyOrder(),
        getDefaultListId(),
        getDefaultTagIds(),
        getDefaultNote(),
      ]);
      setSettings(s);
      setLists(l);
      setTags(tagList);

      setLocalCoverOrder(localOrder);
      const order = localOrder?.length ? localOrder : (s?.coverStrategyOrder || (['url', 'brand', 'ai'] as CoverStrategy[]));
      if (order.length > 0) setCoverStrategy(order[0]);

      // 默认分组优先级：本地 storage > 服务器 settings > isDefault list
      const defaultList = localListId || s?.defaultListId || l.find((item) => item.isDefault)?.id || '';
      setSelectedListId(defaultList);

      // 默认标签优先级：本地 storage > 服务器 settings
      const defaultTags = localTagIds?.length ? localTagIds : (s?.defaultTagIds || []);
      setSelectedTagIds(defaultTags);

      // 默认备注（仅本地 storage）
      setNote(localNote || '');
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
      setLoginError(err?.response?.data?.message || t('loginFailed', lang));
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSave() {
    if (!pageUrl) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const payload: Record<string, unknown> = {
        url: pageUrl,
        title: pageTitle,
        coverStrategy,
      };
      if (note) payload.note = note;
      if (selectedTagIds.length) payload.tagIds = selectedTagIds;
      if (selectedListId) payload.listIds = [selectedListId];

      await createCollection(payload as Parameters<typeof createCollection>[0]);
      setSaveStatus('success');
      setSaveMessage(t('saveSuccess', lang));
      setTimeout(() => window.close(), 1200);
    } catch (err: any) {
      setSaveStatus('error');
      setSaveMessage(err?.response?.data?.message || t('saveFailed', lang));
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
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {'\u00A0\u00A0'.repeat(l.depth || 0)}
              {getListDisplayName(l)}
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
