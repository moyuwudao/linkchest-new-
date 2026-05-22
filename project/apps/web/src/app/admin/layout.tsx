'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Terminal,
  Bug,
  Bell,
  Users,
  ChevronLeft,
  Shield,
  LogOut,
  Crown,
} from 'lucide-react';
import { getToken, logout, getUser, removeToken, removeUser } from '@/lib/auth';
import { api } from '@/lib/api';

const navItems = [
  { href: '/admin', label: '仪表盘', icon: LayoutDashboard },
  { href: '/admin/users', label: '用户管理', icon: Users },
  { href: '/admin/tiers', label: '等级管理', icon: Crown },
  { href: '/admin/logs', label: '日志查询', icon: Terminal },
  { href: '/admin/errors', label: 'BUG 管理', icon: Bug },
  { href: '/admin/alerts', label: '告警配置', icon: Bell },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login?redirect=' + encodeURIComponent(pathname));
      return;
    }

    api.get('/admin/me')
      .then(() => {
        setUser(getUser());
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        const status = err.response?.status;
        const debug = err.response?.data?.debug;
        if (status === 401) {
          // Token 过期/无效，清除本地凭证并跳转登录页（带 redirect 以便登录后回 admin）
          removeToken();
          removeUser();
          window.location.replace('/login?logout=1&redirect=' + encodeURIComponent(pathname));
        } else if (status === 404) {
          // 非管理员：隐藏入口，直接跳转首页（不暴露 admin 存在）
          router.replace('/');
        } else {
          // 网络错误或服务端 500，显示重试界面（带上服务端 debug 信息）
          let msg = err.message || '未知错误';
          if (debug) {
            msg += ` (服务端: ${debug})`;
          }
          setError('连接失败：' + msg);
          setLoading(false);
        }
      });
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <Shield className="w-5 h-5 animate-pulse" />
          <span className="text-sm">验证管理员身份...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="w-10 h-10 text-gray-300 mx-auto" />
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              api.get('/admin/me')
                .then(() => {
                  setUser(getUser());
                  setLoading(false);
                })
                .catch((err) => {
                  const status = err.response?.status;
                  const debug = err.response?.data?.debug;
                  if (status === 401) {
                    removeToken();
                    removeUser();
                    window.location.replace('/login?logout=1&redirect=' + encodeURIComponent(pathname));
                  } else if (status === 404) {
                    router.replace('/');
                  } else {
                    let msg = err.message || '未知错误';
                    if (debug) {
                      msg += ` (服务端: ${debug})`;
                    }
                    setError('连接失败：' + msg);
                    setLoading(false);
                  }
                });
            }}
            className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex">
      {/* 侧边栏 */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 transition-all duration-300 flex flex-col shadow-sm ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-gray-100">
          <Shield className="w-5 h-5 text-amber-500 shrink-0" />
          {!collapsed && (
            <span className="ml-2.5 font-semibold text-sm text-gray-800 truncate">
              LinkChest Admin
            </span>
          )}
        </div>

        {/* 导航 */}
        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-50 text-amber-600'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* 底部 */}
        <div className="p-2 border-t border-gray-100 space-y-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
          >
            <ChevronLeft
              className={`w-[18px] h-[18px] shrink-0 transition-transform duration-200 ${
                collapsed ? 'rotate-180' : ''
              }`}
            />
            {!collapsed && <span>收起侧边栏</span>}
          </button>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span>退出</span>}
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main
        className={`flex-1 min-h-screen transition-all duration-300 ${
          collapsed ? 'ml-16' : 'ml-56'
        }`}
      >
        {/* 顶部栏 */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-gray-200 bg-white">
          <h1 className="text-sm font-medium text-gray-700">
            {navItems.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'))?.label || '管理后台'}
          </h1>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{(user as Record<string, string>)?.email || (user as Record<string, string>)?.nickname || '管理员'}</span>
          </div>
        </header>

        {/* 页面内容 */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
