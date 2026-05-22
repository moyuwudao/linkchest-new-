// 认证工具函数，token 同时存储在 cookie 和 localStorage 中
// cookie 供 Next.js Middleware 读取，localStorage 供 axios 拦截器读取

const TOKEN_KEY = 'linkchest_token';
const USER_KEY = 'linkchest_user';

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30天

function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === 'undefined') return;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  // 移除 Partitioned，避免跨域/中间件读取问题
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  const pastDate = 'Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = `${name}=; Path=/; Expires=${pastDate}; Max-Age=0; SameSite=Lax${secure}`;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return getCookie(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  setCookie(TOKEN_KEY, token, COOKIE_MAX_AGE);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  deleteCookie(TOKEN_KEY);
}

export function getUser(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
}

export function setUser(user: Record<string, unknown>): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('linkchest-user-updated', { detail: user }));
  }
}

export function removeUser(): void {
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function logout(): void {
  removeToken();
  removeUser();
  window.dispatchEvent(new CustomEvent('linkchest-logout'));
  window.location.replace('/login?logout=1&t=' + Date.now());
}
