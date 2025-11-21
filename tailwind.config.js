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
        // Koedoe Design System
        background: '#1A1A1A', // Koedoe Charcoal
        foreground: '#E8E2D6', // Koedoe Sand
        accent: '#B46E3A', // Horn Copper
        card: '#121212', // Koedoe Horn Black (Softened)
        surface: '#121212', // Koedoe Horn Black (Softened)
        muted: '#F7F3EE', // Koedoe Ivory (used for muted text or secondary elements)
        border: '#2C2C2C', // Slightly lighter charcoal for borders
        
        // Specific palette reference
        'koedoe-charcoal': '#1A1A1A',
        'koedoe-sand': '#E8E2D6',
        'koedoe-black': '#000000',
        'koedoe-ivory': '#F7F3EE',
        'horn-copper': '#B46E3A',
      },
      fontFamily: {
        sans: ['Inter', 'System'],
        heading: ['InterTight', 'System'],
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
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 2px 4px 0 rgba(0, 0, 0, 0.08)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 8px 12px -2px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
};
