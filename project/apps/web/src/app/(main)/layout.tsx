'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import { isLoggedIn, getUser } from '@/lib/auth';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';

const OnboardingModal = dynamic(() => import('@/components/OnboardingModal'), { ssr: false });

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }
    // 检查是否需要显示引导（本地已选择不再提醒则不显示）
    if (typeof window !== 'undefined' && localStorage.getItem('linkchest_onboarding_dismissed') === 'true') {
      return;
    }
    const user = getUser();
    const settings = (user?.settings as Record<string, unknown>) || {};
    if (!settings.onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [router]);

  // 在客户端 hydration 完成前，显示加载状态，避免误判登录状态导致跳转循环
  if (!isClient) {
    return (
      <div className="flex h-screen bg-paper dark:bg-ink items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-chest-500"></div>
      </div>
    );
  }

  const handleOnboardingComplete = (dismissForever?: boolean) => {
    setShowOnboarding(false);
    // 更新本地用户数据
    const user = getUser();
    if (user) {
      user.settings = { ...(user.settings as Record<string, unknown>), onboardingCompleted: true };
      if (typeof window !== 'undefined') {
        localStorage.setItem('linkchest_user', JSON.stringify(user));
        window.dispatchEvent(new CustomEvent('linkchest-user-updated', { detail: user }));
      }
    }
    // 记录不再提醒
    if (dismissForever && typeof window !== 'undefined') {
      localStorage.setItem('linkchest_onboarding_dismissed', 'true');
    }
  };

  return (
    <div className="flex h-screen bg-paper dark:bg-ink overflow-hidden">
      {/* Desktop Sidebar */}
      <div
        className={cn(
          'hidden md:block h-full flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden',
          sidebarOpen ? 'w-[220px]' : 'w-[60px]'
        )}
      >
        <Sidebar
          collapsed={!sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>

      {/* Mobile Sidebar Drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full w-[220px] z-50 md:hidden">
            <Sidebar
              mobile
              onMobileClose={() => setMobileOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-chest-400/20 bg-chest-500 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded-md text-parchment/70 hover:bg-parchment/10 transition-colors"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <Logo size={28} variant="dark" />
            <span className="text-base font-display font-semibold text-parchment">
              LinkChest
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}
    </div>
  );
}
