/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        win: '#16a34a',
        loss: '#dc2626',
        flat: '#6b7280',
      },
    },
  },
  plugins: [],
};
