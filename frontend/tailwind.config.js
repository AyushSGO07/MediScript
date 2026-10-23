/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#172033',
          900: '#0F172A',
          950: '#080D1A',
        },
        brand: {
          cyan: '#0EA5E9',
          teal: '#14B8A6',
          dark: '#0F172A',
          card: '#1E293B',
          border: '#334155',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      }
    },
  },
  plugins: [],
}
