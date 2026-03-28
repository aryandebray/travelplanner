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
          bg: '#0a0e1a',
          surface: '#111827',
          card: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-hover': 'rgba(255, 255, 255, 0.15)',
        },
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#06b6d4',   // cyan
          600: '#0891b2',
          700: '#0e7490',
          900: '#0a0e1a',
        },
        accent: {
          cyan: '#06b6d4',
          violet: '#8b5cf6',
          purple: '#a855f7',
          teal: '#14b8a6',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      keyframes: {
        'aurora-1': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)', opacity: '0.4' },
          '33%': { transform: 'translate(30px, -50px) scale(1.2)', opacity: '0.6' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)', opacity: '0.3' },
        },
        'aurora-2': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)', opacity: '0.3' },
          '33%': { transform: 'translate(-40px, 30px) scale(1.1)', opacity: '0.5' },
          '66%': { transform: 'translate(30px, -40px) scale(1.3)', opacity: '0.4' },
        },
        'aurora-3': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1.1)', opacity: '0.3' },
          '50%': { transform: 'translate(20px, 40px) scale(0.9)', opacity: '0.5' },
        },
        'globe-rotate': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(360deg)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(6, 182, 212, 0.15)' },
          '50%': { boxShadow: '0 0 40px rgba(6, 182, 212, 0.3), 0 0 80px rgba(139, 92, 246, 0.15)' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'aurora-1': 'aurora-1 15s ease-in-out infinite',
        'aurora-2': 'aurora-2 20s ease-in-out infinite',
        'aurora-3': 'aurora-3 12s ease-in-out infinite',
        'globe-rotate': 'globe-rotate 30s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 4s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-brand': 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
        'gradient-brand-hover': 'linear-gradient(135deg, #0891b2, #7c3aed)',
      }
    },
  },
  plugins: [],
}
