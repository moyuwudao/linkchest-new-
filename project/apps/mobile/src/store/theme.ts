import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'linkchest-theme';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  colors: typeof lightColors;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  loadTheme: () => Promise<void>;
  setSystemTheme: (isDark: boolean) => void;
}

const lightColors = {
  background: '#F7F5F0',
  card: '#FFFFFF',
  cardBorder: 'rgba(27,42,74,0.08)',
  text: '#2D3142',
  textSecondary: '#5A5A5A',
  textTertiary: '#8A8175',
  textMuted: '#B0A99E',
  border: '#E8E4DC',
  borderLight: '#F0EDE6',
  primary: '#1B2A4A',
  primaryBg: 'rgba(27,42,74,0.08)',
  primaryText: '#1B2A4A',
  input: '#FFFFFF',
  inputBg: '#FFFFFF',
  headerBg: '#1B2A4A',
  headerText: '#F7F5F0',
  secondaryBg: '#EDEAE3',
  danger: '#B85C5C',
  dangerBg: 'rgba(184,92,92,0.1)',
  warning: '#C8956C',
  success: '#5B8A72',
  tagBg: 'rgba(27,42,74,0.06)',
  tagText: '#1B2A4A',
  listTagBg: 'rgba(200,149,108,0.12)',
  listTagText: '#8B6914',
  selectedBg: 'rgba(27,42,74,0.06)',
  overlay: 'rgba(15,20,25,0.5)',
  fabBg: '#1B2A4A',
  modalBg: '#FFFFFF',
  tabBg: '#1B2A4A',
  tabActiveBg: '#C8956C',
  tabText: '#8A8175',
  tabActiveText: '#F7F5F0',
  filterChipBg: '#EDEAE3',
  filterChipActiveBg: '#1B2A4A',
  filterChipText: '#5A5A5A',
  filterChipActiveText: '#F7F5F0',
  statDivider: '#E8E4DC',
  sectionBg: '#FFFFFF',
  menuBg: '#FFFFFF',
  menuBorder: '#E8E4DC',
  inactiveBg: 'rgba(184,92,92,0.1)',
  inactiveText: '#B85C5C',
  batchBg: 'rgba(27,42,74,0.06)',
  batchText: '#1B2A4A',
  surface: 'rgba(255, 255, 255, 0.8)',
  surfaceElevated: 'rgba(255, 255, 255, 0.95)',
  glow: 'rgba(200, 149, 108, 0.15)',
  glowStrong: 'rgba(200, 149, 108, 0.35)',
  shimmer: 'rgba(27, 42, 74, 0.05)',
};

const darkColors: typeof lightColors = {
  background: '#0F1419',
  card: '#1A1F2A',
  cardBorder: 'rgba(232,228,220,0.08)',
  text: '#E8E4DC',
  textSecondary: '#B0A99E',
  textTertiary: '#8A8175',
  textMuted: '#6B6560',
  border: '#2A303A',
  borderLight: '#1E242E',
  primary: '#C8956C',
  primaryBg: 'rgba(200,149,108,0.15)',
  primaryText: '#C8956C',
  input: '#1A1F2A',
  inputBg: '#1A1F2A',
  headerBg: '#0F1419',
  headerText: '#E8E4DC',
  secondaryBg: '#1E242E',
  danger: '#E07070',
  dangerBg: 'rgba(224,112,112,0.15)',
  warning: '#D4A574',
  success: '#6BA88A',
  tagBg: 'rgba(200,149,108,0.12)',
  tagText: '#D4A574',
  listTagBg: 'rgba(139,125,179,0.15)',
  listTagText: '#A599C8',
  selectedBg: 'rgba(200,149,108,0.1)',
  overlay: 'rgba(0,0,0,0.7)',
  fabBg: '#C8956C',
  modalBg: '#1A1F2A',
  tabBg: '#0F1419',
  tabActiveBg: '#C8956C',
  tabText: '#8A8175',
  tabActiveText: '#F7F5F0',
  filterChipBg: '#1E242E',
  filterChipActiveBg: '#C8956C',
  filterChipText: '#B0A99E',
  filterChipActiveText: '#0F1419',
  statDivider: '#2A303A',
  sectionBg: '#1A1F2A',
  menuBg: '#1A1F2A',
  menuBorder: '#2A303A',
  inactiveBg: 'rgba(224,112,112,0.15)',
  inactiveText: '#E07070',
  batchBg: 'rgba(200,149,108,0.1)',
  batchText: '#C8956C',
  surface: 'rgba(26, 31, 42, 0.8)',
  surfaceElevated: 'rgba(30, 36, 46, 0.95)',
  glow: 'rgba(200, 149, 108, 0.25)',
  glowStrong: 'rgba(200, 149, 108, 0.45)',
  shimmer: 'rgba(232, 228, 220, 0.05)',
};

const getResolvedTheme = (theme: Theme, isSystemDark: boolean): 'light' | 'dark' => {
  if (theme === 'system') return isSystemDark ? 'dark' : 'light';
  return theme;
};

let systemIsDark = false;

export { lightColors, darkColors };

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'system',
  resolvedTheme: 'light',
  colors: lightColors,

  setTheme: (theme: Theme) => {
    AsyncStorage.setItem(THEME_KEY, theme);
    const resolved = getResolvedTheme(theme, systemIsDark);
    set({
      theme,
      resolvedTheme: resolved,
      colors: resolved === 'dark' ? darkColors : lightColors,
    });
  },

  toggleTheme: () => {
    const { theme } = get();
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    get().setTheme(next);
  },

  loadTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        const resolved = getResolvedTheme(saved as Theme, systemIsDark);
        set({
          theme: saved as Theme,
          resolvedTheme: resolved,
          colors: resolved === 'dark' ? darkColors : lightColors,
        });
      }
    } catch (err) {
      console.warn('Failed to load theme:', err);
    }
  },

  setSystemTheme: (isDark: boolean) => {
    systemIsDark = isDark;
    const { theme } = get();
    if (theme === 'system') {
      const resolved = isDark ? 'dark' : 'light';
      set({
        resolvedTheme: resolved,
        colors: resolved === 'dark' ? darkColors : lightColors,
      });
    }
  },
}));
