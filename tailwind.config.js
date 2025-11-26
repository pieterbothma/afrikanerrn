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
        // Neobrutalist Palette
        charcoal: '#1A1A1A',  // Main text, borders, icons
        sand: '#E8E2D6',      // Light backgrounds, cards
        ivory: '#F7F3EE',     // Chat bubbles, UI panels
        copper: '#DE7356',    // Primary accent, user bubble
        
        // Accents
        yellow: '#FFD800',    // Hero screens, buttons, feature highlights
        teal: '#3EC7E3',      // Secondary accent, settings tiles
        veldGreen: '#3AA66E', // Success, positive CTAs
        
        // Utility
        borderBlack: '#000000', // 2-3px brutalist outlines
        errorRed: '#E63946',    // Errors

        // Semantic mapping
        background: '#E8E2D6', // Sand
        foreground: '#1A1A1A', // Charcoal
        card: '#F7F3EE',       // Ivory
        primary: '#DE7356',    // Copper
        border: '#000000',     // Border Black
        
        // Keep legacy names if needed but map to new palette
        accent: {
          DEFAULT: '#DE7356', // Copper
          light: '#FFD800',   // Yellow
          dark: '#1A1A1A',    // Charcoal
        },
        surface: {
          DEFAULT: '#F7F3EE', // Ivory
          elevated: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#1A1A1A', // Charcoal (high contrast)
          foreground: '#1A1A1A',
        },
      },
      borderWidth: {
        DEFAULT: '2px',
        '3': '3px',
      },
      borderRadius: {
        sm: '8px',
        md: '12px', // Guide: 12-16 (soft but structured)
        lg: '16px',
        xl: '24px',
        full: '9999px', // For pill buttons
      },
      fontFamily: {
        sans: ['Inter', 'System'],
        heading: ['Inter', 'System'], 
      },
      fontSize: {
        h1: ['32px', { lineHeight: '38px', fontWeight: '900' }],
        h2: ['26px', { lineHeight: '32px', fontWeight: '800' }],
        h3: ['20px', { lineHeight: '28px', fontWeight: '700' }],
        body: ['15px', { lineHeight: '22px', fontWeight: '400' }],
        small: ['12px', { lineHeight: '16px', fontWeight: '500' }],
        // Legacy sizes
        xs: ['12px', { lineHeight: '16px', letterSpacing: '0.02em' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '26px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '38px' }],
      },
      boxShadow: {
        // Hard shadows for neobrutalism
        brutal: '4px 4px 0px 0px #000000',
        'brutal-sm': '2px 2px 0px 0px #000000',
        none: 'none',
        // Legacy fallback (mapped to none or brutal)
        sm: '2px 2px 0px 0px #000000',
        DEFAULT: '4px 4px 0px 0px #000000',
        md: '4px 4px 0px 0px #000000',
      }
    },
  },
  plugins: [],
};
