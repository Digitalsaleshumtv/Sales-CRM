/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fef2f2',
          100: '#fee2e2',
          500: '#c0392b',
          600: '#a93226',
          700: '#922b21',
          900: '#641e16',
        },
      },
    },
  },
  plugins: [],
}

