/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        atlas: {
          // Surface hierarchy (from Stitch "Atlas Flight Deck" design system)
          bg: '#10131b',        // surface — base void
          bg2: '#181b23',       // surface-container-low — inactive regions
          bg3: '#1d2027',       // surface-container — card backgrounds
          bg4: '#272a32',       // surface-container-high — elevated/active
          bg5: '#32353d',       // surface-container-highest — modals

          // Primary — Terminal Amber
          amber: '#f0a050',     // primary-container — button fills
          amber2: '#ffc188',    // primary — lighter text accents
          amber3: '#ffdcc0',    // primary-fixed — very light

          // Secondary — Atmospheric Cyan
          cyan: '#74d1ff',      // secondary
          cyan2: '#149ccb',     // secondary-container

          // Tertiary — Warm off-white
          text: '#e0e2ed',      // on-surface — primary text
          text2: '#d8c3b2',     // on-surface-variant
          muted: '#a08d7e',     // outline — muted elements
          muted2: '#534438',    // outline-variant — very muted

          // Utility
          green: '#5ad88a',
          red: '#ffb4ab',
          border: 'rgba(255,255,255,0.07)',   // ghost border
          border2: 'rgba(255,255,255,0.12)',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Work Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        sans: ['Work Sans', 'sans-serif'],
      },
      boxShadow: {
        'glow-amber': '0 0 12px rgba(240, 160, 80, 0.25)',
        'glow-cyan': '0 0 12px rgba(116, 209, 255, 0.25)',
        'glow-amber-lg': '0 0 24px rgba(240, 160, 80, 0.35)',
      },
      keyframes: {
        'board-flip': {
          '0%': { transform: 'rotateX(0deg)' },
          '50%': { transform: 'rotateX(-90deg)', opacity: '0.3' },
          '100%': { transform: 'rotateX(0deg)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'marquee': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'board-flip': 'board-flip 0.6s ease-in-out',
        'shimmer': 'shimmer 1.5s infinite',
        'marquee': 'marquee 20s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
      }
    },
  },
  plugins: [],
}
