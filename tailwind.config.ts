import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand accent: sky #0369a1 (hover #075985). Deliberate: a calm operational/dispatch read for a
        // care-coordination board. Clearly blue-sky, distinct from the sibling cyan #0e7490 and from the
        // deeper sibling blue #1d4ed8, and outside the indigo/violet band.
        sky: { DEFAULT: '#0369a1', hover: '#075985' },
        ink: { DEFAULT: '#18181b', soft: '#52525b', faint: '#71717a' },
        hair: '#e4e4e7',
        ground: '#fcfcfd',
        warn: '#b45309',
        ok: '#15803d',
        bad: '#b91c1c',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: { btn: '8px', card: '10px', field: '8px' },
    },
  },
  plugins: [],
};
export default config;
