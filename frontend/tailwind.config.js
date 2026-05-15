/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff3e0',
          100: '#ffe0b2',
          200: '#ffcc80',
          300: '#ffb74d',
          400: '#ffa726',
          500: '#cc7a00',
          600: '#995c00',
          700: '#7a4a00',
          800: '#5c3800',
          900: '#3d2500',
        },
      },
    },
  },
  plugins: [],
}
