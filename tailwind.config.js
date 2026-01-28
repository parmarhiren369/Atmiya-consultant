/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        'xs': '475px',
      },
      borderRadius: {
        'sharp': '4px',
        'card': '6px',
      },
    },
  },
  plugins: [],
};
