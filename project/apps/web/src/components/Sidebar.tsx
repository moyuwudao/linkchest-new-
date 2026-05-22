'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  FolderOpen,
  Share2,
  Settings,
  Sun,
  Moon,
  LogOut,
  Plus,
  ChevronRight,
  Tag,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react';
import { getUser, setUser as saveUser, logout, isLoggedIn } from '@/lib/auth';
import { api } from '@/lib/api';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import Logo from './Logo';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  mobile?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({
  collapsed = false,
  onToggle,
  mobile = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const { t } = useI18n();

  const menuItems = [
    { icon: LayoutGrid, label: t('sidebar.collections'), href: '/collections' },
    { icon: SlidersHorizontal, label: t('sidebar.manage'), href: '/manage' },
    { icon: Settings, label: t('sidebar.settings'), href: '/settings' },
  ];

  useEffect(() => {
    const stored = getUser();
    setUser(stored);
    setMounted(true);

    if (isLoggedIn()) {
      api
        .get('/auth/me')
        .then((res) => {
          const userData = res.data.data || res.data;
          if (userData && userData.id) {
            saveUser(userData);
            setUser(userData);
          }
        })
        .catch(() => {
          /* ignore */
        });
    }

    const handleUserUpdate = (e: Event) => {
      const userData = (e as CustomEvent).detail;
      if (userData && userData.id) {
        setUser(userData);
      }
    };
    window.addEventListener('linkchest-user-updated', handleUserUpdate);
    return () =>
      window.removeEventListener('linkchest-user-updated', handleUserUpdate);
  }, []);

  if (!mounted) {
    return (
      <aside className="w-full h-full flex flex-col bg-chest-500 border-r border-chest-400/20">
        <div
          className={cn(
            'py-5 border-b border-parchment/10',
            collapsed ? 'px-2 flex justify-center' : 'px-5'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-amber-400 flex items-center justify-center">
              <LayoutGrid size={20} className="text-chest-500" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-lg font-bold text-parchment leading-tight">
                  {t('sidebar.appName')}
                </h1>
                <p className="text-xs text-parchment/50 mt-0.5">
                  {t('sidebar.subtitle')}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1" />
      </aside>
    );
  }

  return (
    <aside className="w-full h-full flex flex-col bg-chest-500 border-r border-chest-400/20 shadow-[4px_0_24px_rgba(0,0,0,0.08)] transition-colors duration-200">
      {/* Mobile Close Button */}
      {mobile && onMobileClose && (
        <div className="flex items-center justify-end px-4 py-2 border-b border-parchment/10 md:hidden">
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-md text-parchment/60 hover:bg-parchment/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Logo 区域 */}
      <div
        className={cn(
          'py-5 border-b border-parchment/10',
          collapsed ? 'px-2' : 'px-5'
        )}
      >
        <div
          className={cn(
            'flex items-center',
            collapsed ? 'justify-center' : 'gap-3'
          )}
        >
          <Logo size={collapsed ? 32 : 40} variant="dark" />
          {!collapsed && (
            <div>
              <h1 className="text-lg font-display font-semibold text-parchment leading-tight tracking-tight">
                {t('sidebar.appName')}
              </h1>
              <p className="text-xs text-parchment/50 mt-0.5 font-sans">
                {t('sidebar.subtitle')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 添加收藏按钮 */}
      <div className={cn('pt-4', collapsed ? 'px-2' : 'px-4')}>
        <Link
          href="/add"
          className={cn(
            'flex items-center justify-center gap-2 w-full bg-amber-400 text-chest-500 rounded-md font-semibold text-sm shadow-elevated hover:bg-amber-500 hover:shadow-card-hover hover:scale-[1.02] active:scale-[0.98] active:shadow-card transition-all duration-200',
            collapsed ? 'px-2 py-3' : 'px-4 py-3'
          )}
        >
          <Plus size={18} strokeWidth={2.5} />
          {!collapsed && <span>{t('sidebar.addCollection')}</span>}
        </Link>
      </div>

      {/* 导航菜单 */}
      <nav
        className={cn(
          'flex-1 py-4 space-y-0.5',
          collapsed ? 'px-2' : 'px-3'
        )}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href === '/manage' && pathname?.startsWith('/manage')) || (item.href === '/collections' && (pathname === '/collections' || pathname === '/'));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => mobile && onMobileClose?.()}
              className={cn(
                'group relative flex items-center rounded-md text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-parchment/10 text-amber-300'
                  : 'text-parchment/60 hover:bg-parchment/5 hover:text-parchment/90 hover:translate-x-0.5',
                collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
              )}
            >
              {isActive && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-amber-400 shadow-[0_0_8px_rgba(200,149,108,0.4)]" />
              )}
              <Icon
                size={18}
                strokeWidth={isActive ? 2.5 : 2}
                className={cn(
                  'transition-colors duration-200 flex-shrink-0',
                  isActive ? 'text-amber-400' : 'text-parchment/40 group-hover:text-parchment/70'
                )}
              />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <ChevronRight size={14} className="text-amber-400/70 flex-shrink-0" />
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 底部用户区域 */}
      <div className={cn('pb-4 space-y-1', collapsed ? 'px-2' : 'px-3')}>
        {/* 收起/展开侧边栏 */}
        {onToggle && !mobile && (
          <button
            onClick={onToggle}
            className={cn(
              'flex items-center w-full rounded-md text-sm font-medium text-parchment/60 hover:bg-parchment/5 hover:text-parchment/90 hover:translate-x-0.5 transition-all duration-200',
              collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
            )}
            title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} strokeWidth={2} className="text-parchment/40" />
            ) : (
              <>
                <PanelLeftClose size={18} strokeWidth={2} className="text-parchment/40" />
              </>
            )}
          </button>
        )}

        {/* 主题切换 */}
        <button
          onClick={toggleTheme}
          className={cn(
            'flex items-center w-full rounded-md text-sm font-medium text-parchment/60 hover:bg-parchment/5 hover:text-parchment/90 hover:translate-x-0.5 transition-all duration-200',
            collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
          )}
          title={resolvedTheme === 'light' ? t('sidebar.darkMode') : t('sidebar.lightMode')}
        >
          {resolvedTheme === 'light' ? (
            <Moon size={18} strokeWidth={2} className="text-parchment/40" />
          ) : (
            <Sun size={18} strokeWidth={2} className="text-amber-400" />
          )}
        </button>

        {/* 用户卡片 */}
        <Link
          href="/account"
          className={cn(
            'flex items-center rounded-md hover:bg-parchment/5 transition-all duration-200 group hover:translate-x-0.5',
            collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-3'
          )}
        >
          <div className="w-9 h-9 rounded-md bg-parchment/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-sm font-bold text-amber-300">
                {user?.username?.[0] || user?.nickname?.[0] || 'U'}
              </span>
            )}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-parchment/90 truncate leading-tight">
                  {user?.username || user?.nickname || t('sidebar.account')}
                </p>
                <p className="text-xs text-parchment/40 truncate mt-0.5">
                  {t('sidebar.accountCenter')}
                </p>
              </div>
              <ChevronRight size={14} className="text-parchment/30 group-hover:text-amber-400/70 transition-colors" />
            </>
          )}
        </Link>

        {/* 登出 */}
        <button
          onClick={logout}
          className={cn(
            'flex items-center w-full rounded-md text-sm font-medium text-parchment/60 hover:bg-rust/10 hover:text-rust-light hover:translate-x-0.5 transition-all duration-200',
            collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
          )}
          title={t('sidebar.logout')}
        >
          <LogOut size={18} strokeWidth={2} className="flex-shrink-0" />
        </button>
      </div>
    </aside>
  );
}
