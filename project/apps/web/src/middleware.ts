import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware 处理路由重定向和认证保护
// token 同时存储在 cookie 和 localStorage 中，cookie 供 middleware 读取

// 需要认证才能访问的路径（/ 由 landing 页面自行处理重定向）
const PROTECTED_PATHS = ['/add', '/lists', '/tags', '/shares', '/shares/create', '/trash', '/settings', '/account', '/edit'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('linkchest_token')?.value;

  // 已登录访问 /login，重定向到收藏页
  if (token && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/collections';
    const response = NextResponse.redirect(url);
    response.headers.set('Cache-Control', 'no-store, private');
    return response;
  }

  // 未登录访问受保护路由，重定向到登录页
  if (!token && PROTECTED_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(url);
    response.headers.set('Cache-Control', 'no-store, private');
    return response;
  }

  // 对受保护路由统一设置防缓存头，避免浏览器共享缓存导致隐私泄露
  const isProtected = PROTECTED_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'));
  const response = NextResponse.next();
  if (isProtected) {
    response.headers.set('Cache-Control', 'no-store, private, must-revalidate');
  }
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|s/).*)'],
};
