/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cat: {
          yellow: '#FFC500',
          black: '#000000',
          red: '#CD111E',
          bg: '#121212',
          surface: '#1E1E1E',
          border: '#333333',
        }
      }
    }
  },
  plugins: [],
}
