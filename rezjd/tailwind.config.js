/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Japandi Light
        japandi: {
          bg: '#F5F5F0',
          card: '#FFFFFF',
          primary: '#4A6C6F',
          accent: '#C2A878',
          text: '#2E2E2E',
          muted: '#8A8A8A',
          border: '#E5E5E0',
        },
        // Gothic Dark
        gothic: {
          bg: '#0D0D0D',
          card: '#1A1A1A',
          primary: '#7F5AF0',
          accent: '#E94560',
          text: '#EAEAEA',
          muted: '#6B6B6B',
          border: '#2A2A2A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'japandi': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'japandi-md': '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04)',
        'gothic-glow': '0 0 20px rgba(127,90,240,0.15), 0 0 40px rgba(127,90,240,0.08)',
        'gothic-accent': '0 0 20px rgba(233,69,96,0.2)',
        'gothic-card': '0 4px 24px rgba(0,0,0,0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(127,90,240,0.15)' },
          '50%': { boxShadow: '0 0 40px rgba(127,90,240,0.35)' },
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
