import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  email: string | null;
  username: string | null;
  nickname: string | null;
  avatar: string | null;
  hasPassword: boolean;
  googleId?: string | null;
  appleId?: string | null;
  wechatOpenId?: string | null;
  alipayId?: string | null;
  authSource?: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setToken: (token: string) => Promise<void>;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,

  setToken: async (token: string) => {
    await SecureStore.setItemAsync('linkchest_token', token);
    set({ token });
  },

  setUser: (user: User) => {
    set({ user });
    // 国内版：设置极光推送别名
    if (user?.id) {
      import('../lib/jpush').then(({ setJPushAlias }) => {
        setJPushAlias(user.id).catch(() => {});
      });
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('linkchest_token');
    // 国内版：清除极光推送别名
    import('../lib/jpush').then(({ deleteJPushAlias }) => {
      deleteJPushAlias().catch(() => {});
    });
    set({ token: null, user: null });
  },

  loadToken: async () => {
    const token = await SecureStore.getItemAsync('linkchest_token');
    if (token) {
      set({ token });
    }
  },
}));
