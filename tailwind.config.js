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
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 3px rgba(23, 23, 23, 0.04), 0 1px 2px rgba(23, 23, 23, 0.03)',
        card: '0 2px 8px rgba(23, 23, 23, 0.04)',
      },
    },
  },
  plugins: [],
};