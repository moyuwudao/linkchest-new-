'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isLoggedIn } from '@/lib/auth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // 客户端检查登录状态
    if (!isLoggedIn() && pathname !== '/login') {
      window.location.href = '/login';
    }
  }, [pathname]);

  return <>{children}</>;
}
