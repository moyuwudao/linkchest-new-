import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'LXGW WenKai', 'PingFang SC', 'Microsoft YaHei', 'system-ui', 'sans-serif'],
        display: ['Bodoni Moda', 'LXGW WenKai', 'PingFang SC', 'Microsoft YaHei', 'serif'],
      },
      colors: {
        chest: {
          50: '#EEF1F6',
          100: '#D5DBE7',
          200: '#ABB7CF',
          300: '#8193B7',
          350: '#6C82AB',
          400: '#576F9F',
          450: '#3A4D75',
          500: '#1B2A4A',
          600: '#16233D',
          700: '#111C31',
          750: '#0F1829',
          800: '#0D1525',
          850: '#0A111E',
          900: '#080E18',
          950: '#04070C',
        },
        amber: {
          50: '#FBF5EE',
          100: '#F2E4D4',
          200: '#E5C9A9',
          300: '#D8AE7E',
          350: '#D0A175',
          400: '#C8956C',
          450: '#BC885D',
          500: '#B07A4F',
          600: '#8D6240',
          700: '#6A4930',
          800: '#463120',
          900: '#231810',
          950: '#120C08',
        },
        paper: {
          DEFAULT: '#F7F5F0',
          dark: '#0F1419',
        },
        ink: {
          DEFAULT: '#0F1419',
          light: '#F7F5F0',
          50: '#1E2430',
          100: '#1A1F2A',
          200: '#151A23',
        },
        charcoal: {
          DEFAULT: '#2D3142',
          light: '#E8E4DC',
        },
        parchment: {
          DEFAULT: '#E8E4DC',
          dark: '#2D3142',
          50: '#F0EDE6',
          100: '#D8D4CC',
        },
        taupe: {
          DEFAULT: '#8A8175',
          light: '#B0A99E',
        },
        sage: {
          DEFAULT: '#5B8A72',
          light: '#8FB5A0',
        },
        rust: {
          DEFAULT: '#B85C5C',
          light: '#D48A8A',
        },
        surface: {
          DEFAULT: 'rgba(255, 255, 255, 0.8)',
          dark: 'rgba(26, 31, 42, 0.8)',
          elevated: 'rgba(255, 255, 255, 0.95)',
          'elevated-dark': 'rgba(30, 36, 46, 0.95)',
        },
        glow: {
          DEFAULT: 'rgba(200, 149, 108, 0.15)',
          dark: 'rgba(200, 149, 108, 0.25)',
          strong: 'rgba(200, 149, 108, 0.35)',
        },
      },
      borderRadius: {
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '8px',
        'lg': '10px',
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(27, 42, 74, 0.04), 0 1px 2px rgba(27, 42, 74, 0.02)',
        'card-hover': '0 8px 24px rgba(27, 42, 74, 0.08), 0 2px 8px rgba(27, 42, 74, 0.04)',
        'elevated': '0 4px 12px rgba(27, 42, 74, 0.06), 0 2px 4px rgba(27, 42, 74, 0.03)',
        'floating': '0 12px 40px rgba(15, 20, 25, 0.12), 0 4px 12px rgba(15, 20, 25, 0.06)',
        'glow': '0 0 24px rgba(200, 149, 108, 0.2)',
        'modal': '0 8px 32px rgba(15, 20, 25, 0.12)',
        'float': '0 4px 16px rgba(27, 42, 74, 0.08)',
        'sm': '0 1px 2px rgba(27, 42, 74, 0.04)',
        'md': '0 4px 12px rgba(27, 42, 74, 0.06)',
        'lg': '0 8px 24px rgba(27, 42, 74, 0.08)',
        'xl': '0 12px 40px rgba(15, 20, 25, 0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'stagger-fade-in': 'staggerFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) both',
        'shimmer': 'shimmer 1.2s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        staggerFadeIn: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
