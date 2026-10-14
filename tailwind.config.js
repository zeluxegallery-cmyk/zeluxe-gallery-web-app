/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        zeluxe: {
          gold: '#D4AF37',
          black: '#171717',
          gray: '#777777',
          lightgray: '#EDE8DC',
          fieldbg: '#FFFFFF',
          cream: '#FAF8F3',
          border: '#EDE8DC',
        },
      },
      fontFamily: {
        sans: ['Noto Sans Bengali', 'Inter', 'system-ui', 'sans-serif'],
        english: ['Inter', 'system-ui', 'sans-serif'],
        bangla: ['Noto Sans Bengali', 'system-ui', 'sans-serif'],
        number: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 3px rgba(23, 23, 23, 0.04), 0 1px 2px rgba(23, 23, 23, 0.03)',
        card: '0 2px 8px rgba(23, 23, 23, 0.04)',
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],
        'sm': ['0.875rem', { lineHeight: '1.55' }],
        'base': ['1rem', { lineHeight: '1.6' }],
        'lg': ['1.125rem', { lineHeight: '1.6' }],
        'xl': ['1.25rem', { lineHeight: '1.5' }],
        '2xl': ['1.5rem', { lineHeight: '1.4' }],
        '3xl': ['1.875rem', { lineHeight: '1.3' }],
        '4xl': ['2.25rem', { lineHeight: '1.2' }],
        '5xl': ['3rem', { lineHeight: '1.15' }],
      },
    },
  },
  plugins: [],
};