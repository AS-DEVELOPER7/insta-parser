/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ig: {
          bg: '#000000',
          elevated: '#121212',
          surface: '#181818',
          border: '#262626',
          primary: '#0095f6',
          'primary-hover': '#1877f2',
          secondary: '#a8a8a8',
          muted: '#737373',
          red: '#ed4956',
          'story-gradient-from': '#f9ce34',
          'story-gradient-via': '#ee2a7b',
          'story-gradient-to': '#6228d7',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
