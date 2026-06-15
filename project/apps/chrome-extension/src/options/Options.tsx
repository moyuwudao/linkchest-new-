import React, { useEffect, useState } from 'react';
import {
  isLoggedIn,
  getUser,
  logout,
  setToken,
  setUser as saveUserToStorage,
  getQuickSaveMode,
  setQuickSaveMode,
  getCoverStrategyOrder,
  setCoverStrategyOrder,
  getLanguage,
  setLanguage,
  getServerUrl,
  getDefaultListId,
  setDefaultListId,
  getDefaultTagIds,
  setDefaultTagIds,
  getDefaultNote,
  setDefaultNote,
  getDefaultPageType,
  setDefaultPageType,
  getCurrentServer,
  setServerConfig,
  PRESET_SERVERS,
  type QuickSaveMode,
  type CoverStrategy,
  type ServerConfig,
  detectSystemLocale,
} from '../lib/storage';
import { login, getFlatLists, getTags } from '../lib/api';
import { t } from '../lib/i18n';

const LOCALE_LABEL: Record<string, string> = {
  zh: '简体中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
  de: 'Deutsch',
};

type TabKey = 'quickSave' | 'language' | 'account' | 'shortcuts';

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

function getListDisplayName(list: ListItem, lang: string): string {
  if (list.name === '__DEFAULT_LIST__' || list.name === 'default_list' || list.isDefault) {
    return t('myCollections', lang);
  }
  return list.name;
}

function getTierLabel(tier: string, lang: string): string {
  const keyMap: Record<string, string> = {
    medium: 'tierMedium',
    heavy: 'tierHeavy',
    super: 'tierSuper',
  };
  return t(keyMap[tier] || 'tierMedium', lang);
}

export default function Options() {
  const detectedLang = detectSystemLocale();
  const [activeTab, setActiveTab] = useState<TabKey>('quickSave');
  const [lang, setLang] = useState(detectedLang);
  const [shortcutKey, setShortcutKey] = useState('Ctrl+Shift+S');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUserState] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const [quickSaveMode, setQuickSaveModeState] = useState<QuickSaveMode>('silent');
  const [coverOrder, setCoverOrderState] = useState<CoverStrategy[]>(['url', 'brand', 'ai']);
  const [language, setLanguageState] = useState(detectedLang);

  const [lists, setLists] = useState<ListItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [defaultListId, setDefaultListIdState] = useState<string>('');
  const [defaultTagIds, setDefaultTagIdsState] = useState<string[]>([]);
  const [defaultNote, setDefaultNoteState] = useState('');
  const [defaultPageType, setDefaultPageTypeState] = useState<string>('');  // '' = 自动识别
  const [currentServer, setCurrentServer] = useState<ServerConfig>(PRESET_SERVERS[0]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'quickSave', label: t('quickSaveMode', lang) },
    { key: 'shortcuts', label: t('keyboardShortcuts', lang) },
    { key: 'language', label: t('interfaceLanguage', lang) },
    { key: 'account', label: t('accountInfo', lang) },
  ];

  useEffect(() => {
    async function init() {
      const [li, mode, order, lng, defListId, defTagIds, defNote, defPageType, server] = await Promise.all([
        isLoggedIn(),
        getQuickSaveMode(),
        getCoverStrategyOrder(),
        getLanguage(),
        getDefaultListId(),
        getDefaultTagIds(),
        getDefaultNote(),
        getDefaultPageType(),
        getCurrentServer(),
      ]);
      setLoggedIn(li);
      if (li) {
        const u = await getUser();
        setUserState(u);
        loadListsAndTags();
      }
      setQuickSaveModeState(mode);
      setCoverOrderState(order);
      setLanguageState(lng);
      setLang(lng);
      setDefaultListIdState(defListId || '');
      setDefaultTagIdsState(defTagIds || []);
      setDefaultNoteState(defNote || '');
      setDefaultPageTypeState(defPageType || '');
      setCurrentServer(server);

      // 获取当前快捷键设置
      if (typeof chrome !== 'undefined' && chrome.commands) {
        chrome.commands.getAll((commands) => {
          const saveCommand = commands.find((cmd) => cmd.name === 'save-to-linkchest');
          if (saveCommand?.shortcut) {
            setShortcutKey(saveCommand.shortcut);
          }
        });
      }
    }
    init();
  }, []);

  async function loadListsAndTags() {
    setDataLoading(true);
    try {
      const [l, tagList] = await Promise.all([getFlatLists(), getTags()]);
      setLists(l);
      setTags(tagList);

      const savedDefaultListId = await getDefaultListId();
      if (!savedDefaultListId && l.length > 0) {
        const defaultList = l.find((item) => item.isDefault);
        if (defaultList) {
          setDefaultListIdState(defaultList.id);
          await setDefaultListId(defaultList.id);
        }
      }
    } catch (e) {
      console.error('Failed to load lists and tags', e);
    } finally {
      setDataLoading(false);
    }
  }

  async function handleQuickSaveModeChange(mode: QuickSaveMode) {
    await setQuickSaveMode(mode);
    setQuickSaveModeState(mode);
    showMessage(t('quickSaveSaved', lang), 'success');
  }

  async function handleSaveCoverOrder() {
    await setCoverStrategyOrder(coverOrder);
    showMessage(t('coverPrefSaved', lang), 'success');
  }

  async function handleLanguageChange(code: string) {
    await setLanguage(code);
    setLanguageState(code);
    setLang(code);
    showMessage(t('langSaved', lang), 'success');
  }

  async function handleSaveDefaults() {
    await setDefaultListId(defaultListId || null);
    await setDefaultTagIds(defaultTagIds);
    await setDefaultNote(defaultNote);
    await setDefaultPageType(defaultPageType);
    showMessage(t('defaultsSaved', lang), 'success');
  }

  function moveStrategy(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= coverOrder.length) return;
    const newOrder = [...coverOrder];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setCoverOrderState(newOrder);
  }

  function toggleDefaultTag(id: string) {
    setDefaultTagIdsState((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function showMessage(text: string, type: 'success' | 'error') {
    setMessageType(type);
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await login({ email, password });
      if (res?.token) {
        await setToken(res.token);
        await saveUserToStorage(res.user || {});
        setLoggedIn(true);
        setUserState(res.user || {});
        loadListsAndTags();
        showMessage(t('loginSuccess', lang), 'success');
      } else {
        showMessage(t('loginFailed', lang), 'error');
      }
    } catch (err: any) {
      showMessage(err?.response?.data?.message || t('loginFailed', lang), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleServerChange(serverKey: string) {
    const server = PRESET_SERVERS.find((s) => s.key === serverKey)
    if (!server) return
    await setServerConfig(server)
    setCurrentServer(server)
    showMessage(t('serverSwitched', lang), 'success')
    // 切换服务器后需要重新登录
    await logout()
    setLoggedIn(false)
    setUserState(null)
    setLists([])
    setTags([])
  }

  async function handleLogout() {
    await logout();
    setLoggedIn(false);
    setUserState(null);
    setLists([]);
    setTags([]);
    showMessage(t('logoutSuccess', lang), 'success');
  }

  const collectionsUrlRef = React.useRef('https://linkchest.net');
  useEffect(() => {
    getServerUrl().then((url) => {
      collectionsUrlRef.current = url;
    });
  }, []);

  return (
    <div className="options-container">
      <div className="options-card">
        <div className="options-header">
          <img src="/icons/icon48.png" alt="LinkChest" />
          <h1>LinkChest {t('settings', lang)}</h1>
        </div>

        {/* 标签页导航 */}
        <div className="tab-nav">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 消息提示 */}
        {message && (
          <div className={`status-message ${messageType}`}>{message}</div>
        )}

        {/* 快捷保存方式 */}
        {activeTab === 'quickSave' && (
          <div className="tab-content">
            <div className="section-card">
              <div className="section-title">{t('quickSaveMode', lang)}</div>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="quickSaveMode"
                    checked={quickSaveMode === 'silent'}
                    onChange={() => handleQuickSaveModeChange('silent')}
                  />
                  <span>{t('oneClickSave', lang)}</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="quickSaveMode"
                    checked={quickSaveMode === 'popup'}
                    onChange={() => handleQuickSaveModeChange('popup')}
                  />
                  <span>{t('oneClickNew', lang)}</span>
                </label>
              </div>
            </div>

            <hr className="divider" />

            <div className="section-card">
              <div className="section-title">{t('coverPreference', lang)}</div>
              <div className="strategy-list">
                {coverOrder.map((strategy, index) => (
                  <div key={strategy} className="strategy-item">
                    <span className="strategy-name">
                      <span className="strategy-rank">{index + 1}</span>
                      {t(strategy, lang)}
                    </span>
                    <div className="btn-row">
                      <button
                        className="btn-icon"
                        onClick={() => moveStrategy(index, -1)}
                        disabled={index === 0}
                        title={t('moveUp', lang)}
                      >
                        ↑
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => moveStrategy(index, 1)}
                        disabled={index === coverOrder.length - 1}
                        title={t('moveDown', lang)}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn-secondary strategy-save" onClick={handleSaveCoverOrder}>
                {t('saveCoverPref', lang)}
              </button>
            </div>

            <hr className="divider" />

            {dataLoading ? (
              <div className="loading-text">{t('loading', lang)}</div>
            ) : (
              <>
                <div className="section-card">
                  <div className="section-title">{t('defaultList', lang)}</div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <select
                      value={defaultListId}
                      onChange={(e) => setDefaultListIdState(e.target.value)}
                    >
                      {lists.map((l) => (
                        <option key={l.id} value={l.id}>
                          {'\u00A0\u00A0'.repeat(l.depth || 0)}
                          {getListDisplayName(l, lang)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="section-card">
                  <div className="section-title">{t('defaultTags', lang)}</div>
                  <div className="tag-select">
                    {tags.map((tItem) => (
                      <button
                        key={tItem.id}
                        className={`tag-chip ${defaultTagIds.includes(tItem.id) ? 'active' : ''}`}
                        onClick={() => toggleDefaultTag(tItem.id)}
                      >
                        {tItem.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="section-card">
                  <div className="section-title">{t('defaultNote', lang)}</div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <textarea
                      value={defaultNote}
                      onChange={(e) => setDefaultNoteState(e.target.value)}
                      placeholder={t('optional', lang)}
                      rows={2}
                    />
                  </div>
                </div>

                <div className="section-card">
                  <div className="section-title">{t('defaultPageType', lang)}</div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <select
                      value={defaultPageType}
                      onChange={(e) => setDefaultPageTypeState(e.target.value)}
                    >
                      <option value="">{t('autoDetect', lang)}</option>
                      <option value="home">{t('pageTypeHome', lang)}</option>
                      <option value="detail">{t('pageTypeDetail', lang)}</option>
                      <option value="list">{t('pageTypeList', lang)}</option>
                      <option value="search">{t('pageTypeSearch', lang)}</option>
                      <option value="navigation">{t('pageTypeNavigation', lang)}</option>
                      <option value="document">{t('pageTypeDocument', lang)}</option>
                      <option value="download">{t('pageTypeDownload', lang)}</option>
                      <option value="other">{t('pageTypeOther', lang)}</option>
                    </select>
                  </div>
                </div>

                <button className="btn-secondary" onClick={handleSaveDefaults}>
                  {t('saveDefaults', lang)}
                </button>
              </>
            )}
          </div>
        )}

        {/* 语言设置 */}
        {activeTab === 'language' && (
          <div className="tab-content">
            <div className="section-card">
              <div className="section-title">{t('interfaceLanguage', lang)}</div>
              <div className="radio-group">
                {Object.entries(LOCALE_LABEL).map(([code, label]) => (
                  <label key={code} className="lang-option">
                    <input
                      type="radio"
                      name="language"
                      checked={language === code}
                      onChange={() => handleLanguageChange(code)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 快捷键设置 */}
        {activeTab === 'shortcuts' && (
          <div className="tab-content">
            <div className="section-card">
              <div className="section-title">{t('keyboardShortcuts', lang)}</div>
              <div className="shortcut-display">
                <div className="shortcut-key">
                  <span className="key-combo">{shortcutKey}</span>
                </div>
                <p className="shortcut-desc">{t('shortcutSaveDesc', lang)}</p>
              </div>
              <button
                className="btn-secondary"
                onClick={() => {
                  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
                }}
              >
                {t('customizeShortcut', lang)}
              </button>
              <div className="shortcut-hint">
                <p>{t('shortcutHint', lang)}</p>
              </div>
            </div>
          </div>
        )}

        {/* 账户信息 */}
        {activeTab === 'account' && (
          <div className="tab-content">
            {/* 服务器选择 */}
            <div className="section-card">
              <div className="section-title">{t('serverRegion', lang)}</div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div className="radio-group">
                  {PRESET_SERVERS.map((server) => (
                    <label key={server.key} className="radio-label">
                      <input
                        type="radio"
                        name="server"
                        checked={currentServer.key === server.key}
                        onChange={() => handleServerChange(server.key)}
                      />
                      <span>
                        {server.key === 'global'
                          ? t('serverGlobal', lang)
                          : t('serverChina', lang)}
                        <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>
                          ({server.url})
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <hr className="divider" />

            {loggedIn ? (
              <div>
                <div className="info-row">
                  <span className="label">{t('email', lang)}:</span>
                  <span className="value">{String(user?.email || '-')}</span>
                </div>
                <div className="info-row">
                  <span className="label">{t('accountInfo', lang)}:</span>
                  <span className="value">{String(user?.nickname || user?.username || '-')}</span>
                </div>

                <div className="tier-card">
                  <div>
                    <div className="tier-label">{t('tier', lang)}</div>
                    <div className="tier-value">
                      {getTierLabel(String(user?.userTier || 'medium'), lang)}
                    </div>
                  </div>
                  <a
                    href={`${collectionsUrlRef.current}/tier/upgrade`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tier-badge"
                  >
                    {t('upgradeNow', lang)}
                  </a>
                </div>

                <button className="btn-danger" onClick={handleLogout}>
                  {t('logout', lang)}
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin}>
                <div className="section-card">
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
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? t('loginLoading', lang) : t('login', lang)}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
