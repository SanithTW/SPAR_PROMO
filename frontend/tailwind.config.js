/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        spar: {
          green: {
            DEFAULT: '#007d32',
            50: '#f0fbf4',
            100: '#def7e6',
            200: '#beeed0',
            300: '#8ddfb0',
            400: '#54c78a',
            500: '#007d32', // Primary SPAR Brand Green
            600: '#006f2c',
            700: '#005e26',
            800: '#004c1f',
            900: '#003a18', // Deep green
            950: '#00200c',
          },
          red: {
            DEFAULT: '#E31B23', // SPAR Red accent
            50: '#FEECEE',
            100: '#FCD8DB',
            500: '#E31B23',
            600: '#C9141B',
            700: '#A80F15',
          },
          bg: '#F8F9FA', // Warm off-white background
          card: '#FFFFFF',
          charcoal: '#1F2937',
          muted: '#6B7280',
        },
        emerald: {
          50: '#f0fbf4',
          100: '#def7e6',
          200: '#beeed0',
          300: '#8ddfb0',
          400: '#54c78a',
          500: '#007d32', // Unified with #007d32
          600: '#007d32', // Primary brand green #007d32
          700: '#00682a',
          800: '#005522',
          900: '#003f19',
          950: '#00260f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
