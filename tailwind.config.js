/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./index.html"],
  theme: {
    extend: {
      spacing: {
        '41': '162px'
      }
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
}

