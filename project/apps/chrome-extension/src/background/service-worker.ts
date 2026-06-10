import {
  isLoggedIn,
  getQuickSaveMode,
  getCoverStrategyOrder,
  getDefaultListId,
  getDefaultTagIds,
  getDefaultNote,
  getDefaultPageType,
  getLanguage,
} from '../lib/storage';
import { createCollection, getUserSettings } from '../lib/api';
import { t } from '../lib/i18n';

async function updateContextMenus() {
  const lang = await getLanguage();
  chrome.contextMenus.update('save-page-to-linkchest', {
    title: t('savePageMenu', lang),
  });
  chrome.contextMenus.update('save-link-to-linkchest', {
    title: t('saveLinkMenu', lang),
  });
}

// 点击图标始终打开 popup
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setPopup({ popup: 'popup.html' });
  chrome.contextMenus.create({
    id: 'save-page-to-linkchest',
    title: 'Save current page to LinkChest',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: 'save-link-to-linkchest',
    title: 'Save this link to LinkChest',
    contexts: ['link'],
  });
  updateContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.action.setPopup({ popup: 'popup.html' });
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.linkchest_language) {
    updateContextMenus();
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-page-to-linkchest' || info.menuItemId === 'save-link-to-linkchest') {
    const mode = await getQuickSaveMode();
    const url = info.linkUrl || info.pageUrl || tab?.url || '';
    const title = tab?.title || '';

    if (!url) return;

    if (mode === 'silent') {
      // 一键保存：直接静默保存
      await silentSave(url, title);
    } else {
      // 一键新建：打开 popup 面板
      try {
        await chrome.action.openPopup();
      } catch {
        // fallback：打开独立小窗口
        chrome.windows.create({
          url: chrome.runtime.getURL('popup.html'),
          type: 'popup',
          width: 380,
          height: 600,
        });
      }
    }
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'save-to-linkchest') {
    const url = tab?.url || '';
    const title = tab?.title || '';
    if (url) {
      await silentSave(url, title);
    }
  }
});

async function silentSave(url: string, title: string) {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    chrome.runtime.openOptionsPage();
    return;
  }

  try {
    // 优先使用本地快捷保存设置， fallback 到服务器用户设置
    const [localOrder, localListId, localTagIds, localNote, localPageType, settings] = await Promise.all([
      getCoverStrategyOrder(),
      getDefaultListId(),
      getDefaultTagIds(),
      getDefaultNote(),
      getDefaultPageType(),
      getUserSettings(),
    ]);

    const coverStrategy = localOrder?.[0] || settings?.coverStrategyOrder?.[0] || 'url';
    const listId = localListId || settings?.defaultListId || null;
    const tagIds = localTagIds?.length ? localTagIds : (settings?.defaultTagIds || []);
    const note = localNote || undefined;
    const pageType = localPageType || '';

    const payload: Record<string, unknown> = {
      url,
      title,
      coverStrategy,
    };
    if (listId) payload.listIds = [listId];
    if (tagIds.length) payload.tagIds = tagIds;
    if (note) payload.note = note;
    if (pageType) payload.pageType = pageType;

    await createCollection(payload as Parameters<typeof createCollection>[0]);

    chrome.action.setBadgeText({ text: 'ok' });
    chrome.action.setBadgeBackgroundColor({ color: '#2e7d32' });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 2000);
  } catch (err) {
    console.error('Silent save failed', err);
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#c62828' });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 3000);
  }
}
