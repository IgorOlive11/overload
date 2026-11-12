/** @type {import('tailwindcss').Config} */
// Cores e fonte do mock (design/mock/estilos.css). Os tokens completos saem na #34.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#080808',
        s1: '#0f0f0f',
        s2: '#161616',
        s3: '#1e1e1e',
        line: '#2a2a2a',
        chalk: '#e8e8e8',
        muted: '#9d9d9d',
        dim: '#7d7d7d',
        accent: '#ff1414',
        'accent-dim': '#7a0808',
        ok: '#39ff14',
        warn: '#ffaa00',
      },
      fontFamily: {
        doom: ['"Jersey 10"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { DEFAULT: '4px' },
    },
  },
  plugins: [],
}
