/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        neon:    '#FF1414',
        bg:      '#080808',
        s1:      '#111111',
        s2:      '#1a1a1a',
        s3:      '#222222',
        border1: '#2a2a2a',
        border2: '#333333',
      },
      fontFamily: {
        display: ['"Metal Mania"', 'cursive'],
        mono:    ['"Share Tech Mono"', 'monospace'],
        body:    ['"Barlow Condensed"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}