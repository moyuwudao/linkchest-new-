'use client';

import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { useState, useEffect, ReactNode } from 'react';
import { fetchPlatforms, updatePlatformNames } from '@/lib/platforms';
import { ToastProvider, useToast } from '@/components/Toast';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { type SupportedLocale } from '@linkchest/i18n';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// ChunkLoadError 自动恢复：部署新版本后，用户浏览器缓存的旧 chunk 会 404
// 捕获此错误并自动刷新页面加载新版本
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const message = event.message || '';
    if (message.includes('Loading chunk') || message.includes('ChunkLoadError')) {
      console.warn('[ChunkLoadError] 检测到 chunk 加载失败，自动刷新页面...');
      window.location.reload();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || String(event.reason);
    if (message.includes('Loading chunk') || message.includes('ChunkLoadError')) {
      console.warn('[ChunkLoadError] 检测到 chunk 加载失败，自动刷新页面...');
      event.preventDefault();
      window.location.reload();
    }
  });
}

function QuotaToastListener() {
  const { showAlert } = useToast();
  const { t } = useI18n();
  useEffect(() => {
    const quotaHandler = (e: Event) => {
      showAlert(t('common.quotaExceeded'), 'error');
    };
    const rateLimitHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      showAlert(detail || t('common.rateLimited'), 'error');
    };
    window.addEventListener('quota-exceeded', quotaHandler);
    window.addEventListener('rate-limited', rateLimitHandler);
    return () => {
      window.removeEventListener('quota-exceeded', quotaHandler);
      window.removeEventListener('rate-limited', rateLimitHandler);
    };
  }, [showAlert]);
  return null;
}

// 持久化缓存配置：页面刷新/重新打开后从 localStorage 恢复数据
const browserPersister = typeof window !== 'undefined'
  ? createSyncStoragePersister({
      storage: window.localStorage,
      key: 'linkchest-query-cache',
      throttleTime: 1000,
    })
  : null;

// SSR 安全：服务端使用 noop persister 避免 hydration 问题
const ssrPersister = {
  persistClient: async () => {},
  restoreClient: async () => undefined as any,
  removeClient: async () => {},
};
const persister = browserPersister || ssrPersister;

export function Providers({ children, initialLocale }: { children: ReactNode; initialLocale?: SupportedLocale }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 基于查询 key 的差异化 staleTime：静态配置延长，动态数据保持较短
            // 优化目标：避免过度点击触发后端访问限制（限流已放宽，但前端仍要减少无效请求）
            staleTime: (query) => {
              const key = query.queryKey[0] as string;
              if (key === 'platforms') return 30 * 60 * 1000; // 平台配置 30 分钟
              if (key === 'tags' || key === 'lists') return 5 * 60 * 1000; // 标签/分组 5 分钟
              if (key === 'auth-me' || key === 'my-tier') return 5 * 60 * 1000; // 用户信息/套餐 5 分钟
              if (key === 'stats-platforms' || key === 'stats-overview' || key === 'quota') return 3 * 60 * 1000; // 统计 3 分钟
              if (key === 'backups') return 60 * 1000; // 备份列表 1 分钟
              if (key === 'user-settings-backup') return 2 * 60 * 1000; // 备份设置 2 分钟
              return 90 * 1000; // 默认 90 秒（收藏列表等动态数据）
            },
            refetchOnWindowFocus: false,
            // 只在数据过期(stale)时重新获取，避免页面切换无条件重复请求
            refetchOnMount: true,
          },
        },
      })
  );

  // 监听登出事件，清除 React Query 缓存防止数据残留
  useEffect(() => {
    const handleLogout = () => {
      queryClient.clear();
      if (persister) {
        persister.removeClient();
      }
    };
    window.addEventListener('linkchest-logout', handleLogout);
    return () => window.removeEventListener('linkchest-logout', handleLogout);
  }, [queryClient]);

  // 应用启动时预加载平台配置
  useEffect(() => {
    fetchPlatforms().then(platforms => {
      updatePlatformNames(platforms);
    });
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: persister!,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 缓存 7 天
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            const key = query.queryKey[0] as string;
            // 只持久化特定查询，排除敏感/大体积数据
            const persistable = [
              'collections', 'shares', 'share-lists', 'tags', 'lists',
              'stats-platforms', 'stats-overview', 'trash', 'quota', 'my-tier',
              'systemCovers', 'coverLibrary',
            ];
            return persistable.includes(key);
          },
        },
      }}
    >
      <I18nProvider initialLocale={initialLocale}>
        <ToastProvider>
          <ErrorBoundary>
            <QuotaToastListener />
            {children}
          </ErrorBoundary>
        </ToastProvider>
      </I18nProvider>
    </PersistQueryClientProvider>
  );
}
