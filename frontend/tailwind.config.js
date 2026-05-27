/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        primary: 'var(--primary-hex)',
        success: '#4ade80',
        gold: '#f5a623',
      },
      borderRadius: {
        DEFAULT: '0.875rem',
      },
    },
  },
  plugins: [],
}
