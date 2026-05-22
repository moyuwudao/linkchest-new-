'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getCachedCover, setCachedCover, revokeCachedCover } from '@/lib/coverCache';
import { generateDefaultCover } from '@/lib/platforms';

interface LazyImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  containerClassName?: string;
  platform?: string;
  collectionId?: string;
  aspectRatio?: string;
  onError?: () => void;
  eager?: boolean;
}

export default function LazyImage({
  src,
  alt,
  className = '',
  containerClassName = '',
  platform = 'other',
  collectionId,
  aspectRatio,
  onError,
  eager = false,
}: LazyImageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const createdBlobUrls = useRef<Set<string>>(new Set());

  // Intersection Observer 懒加载（eager 模式跳过）
  useEffect(() => {
    if (eager) {
      setIsVisible(true);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [eager]);

  // 加载图片（优先本地缓存）
  useEffect(() => {
    if (!isVisible) return;

    // src 为空时清除 displaySrc，确保显示 fallback 而非残留旧图
    if (!src) {
      setDisplaySrc(null);
      setIsLoaded(false);
      return;
    }

    const imageSrc = src;
    let cancelled = false;

    async function load() {
      // src 变化时立即重置，避免短暂显示旧图
      setIsLoaded(false);
      setDisplaySrc(null);

      // eager 模式：先同步设置 src 让浏览器立即加载，不阻塞于 IndexedDB
      if (eager) {
        setDisplaySrc(imageSrc);
      }

      // 后台查询 IndexedDB 缓存
      const cached = await getCachedCover(imageSrc, collectionId);
      if (cancelled) {
        if (cached) revokeCachedCover(cached);
        return;
      }

      if (cached) {
        createdBlobUrls.current.add(cached);
        // eager 模式下：如果当前显示的还是原始 src，替换为 Blob URL
        // 非 eager 模式下：直接显示缓存
        setDisplaySrc((current) => {
          if (eager && current !== cached) {
            return cached;
          }
          if (!eager) {
            return cached;
          }
          return current;
        });
        return;
      }

      // 无缓存：非 eager 模式设置 src，eager 模式已提前设置
      if (!eager) {
        setDisplaySrc(imageSrc);
      }

      // 网络加载并缓存（后台执行，不阻塞展示）
      // 统一尝试 fetch 缓存所有图片（包括 COS），CORS 失败时由 Service Worker 兜底
      try {
        const res = await fetch(imageSrc, { mode: 'cors', credentials: 'omit' });
        if (res.ok && res.headers.get('content-type')?.startsWith('image/')) {
          const blob = await res.blob();
          await setCachedCover(imageSrc, blob, collectionId);
        }
      } catch {
        // fetch 缓存失败（如 CORS 限制）不影响展示，Service Worker CacheFirst 已兜底
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isVisible, src, collectionId, eager]);

  // 组件卸载时释放所有创建的 Blob URL
  useEffect(() => {
    return () => {
      createdBlobUrls.current.forEach((url) => revokeCachedCover(url));
      createdBlobUrls.current.clear();
    };
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setDisplaySrc(generateDefaultCover(platform));
    onError?.();
  }, [platform, onError]);

  const fallbackSvg = generateDefaultCover(platform);

  const style: React.CSSProperties = aspectRatio ? { aspectRatio } : {};

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-parchment/10 dark:bg-charcoal/30 ${containerClassName}`}
      style={style}
    >
      {/* 占位骨架/渐变 */}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-parchment/10 to-parchment/5 dark:from-charcoal/40 dark:to-charcoal/20" />
      )}

      {isVisible && displaySrc ? (
        <img
          src={displaySrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
          onLoad={handleLoad}
          onError={handleError}
          referrerPolicy="no-referrer"
        />
      ) : isVisible && !src ? (
        <img
          src={fallbackSvg}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`w-full h-full object-cover ${className}`}
          referrerPolicy="no-referrer"
        />
      ) : null}
    </div>
  );
}
