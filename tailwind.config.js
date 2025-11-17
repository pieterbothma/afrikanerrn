const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, './app/**/*.{ts,tsx}'),
    join(__dirname, './components/**/*.{ts,tsx}'),
    join(__dirname, './hooks/**/*.{ts,tsx}'),
    join(__dirname, './providers/**/*.{ts,tsx}'),
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF', // White (light mode)
        foreground: '#2C2C2C', // Dark gray text
        accent: '#DE7356', // Accent color
        card: '#F7F7F8', // Off-white for cards
        surface: '#FFFFFF', // Pure white for elevated surfaces
        muted: '#8E8EA0', // Muted text
        border: '#E5E5E5', // Light border
        // Dark mode colors (for future implementation)
        'dark-background': '#212121',
        'dark-foreground': '#ECECF1',
        'dark-card': '#1F1F1F',
        'dark-surface': '#2C2C2C',
        'dark-border': '#40414F',
      },
      fontFamily: {
        sans: ['Geist', 'System'],
        mono: ['Geist Mono', 'Courier'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '22px' }],
        lg: ['18px', { lineHeight: '24px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
      },
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        black: '900',
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '12px',
        md: '16px',
        lg: '20px',
        xl: '24px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(44, 44, 44, 0.05)',
        DEFAULT: '0 2px 4px 0 rgba(44, 44, 44, 0.08)',
        md: '0 4px 6px -1px rgba(44, 44, 44, 0.1)',
        lg: '0 8px 12px -2px rgba(44, 44, 44, 0.12)',
      },
    },
  },
  plugins: [],
};
