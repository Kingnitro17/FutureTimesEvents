import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-syne)', 'Syne', 'sans-serif'],
      },
      colors: {
        brand: {
          cyan: '#2CC4EA',
          purple: '#533885',
          pink: '#FF55C2',
          violet: '#7222E3',
          orange: '#FFBC73',
          magenta: '#FF00B9',
          mint: '#46FFAB',
          grape: '#A02EFF',
          blue: '#1D5BFF',
          lime: '#C7FE17',
          fuchsia: '#DD1FFF',
          sky: '#24D8FB',
        },
      },
      backgroundImage: {
        'grad-1': 'linear-gradient(135deg, #2CC4EA, #533885)',
        'grad-2': 'linear-gradient(135deg, #FF55C2, #7222E3)',
        'grad-3': 'linear-gradient(135deg, #FFBC73, #FF00B9)',
        'grad-4': 'linear-gradient(135deg, #46FFAB, #A02EFF)',
        'grad-5': 'linear-gradient(135deg, #1D5BFF, #C7FE17)',
        'grad-6': 'linear-gradient(135deg, #DD1FFF, #24D8FB)',
        'hero-overlay': 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.95) 100%)',
        'hero-dark': 'linear-gradient(180deg, rgba(10,10,15,0.3) 0%, rgba(10,10,15,0.9) 100%)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
        'glass-dark': '0 8px 32px rgba(0,0,0,0.4)',
        'glow-1': '0 0 30px rgba(44,196,234,0.3)',
        'glow-2': '0 0 30px rgba(255,85,194,0.3)',
        'glow-3': '0 0 30px rgba(255,188,115,0.3)',
        'card': '0 4px 24px rgba(0,0,0,0.06)',
        'card-hover': '0 16px 48px rgba(0,0,0,0.12)',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'gradient': 'gradientShift 6s ease infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'bounce-soft': 'bounceSoft 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        gradientShift: { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        bounceSoft: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
      backdropBlur: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '40px' },
    },
  },
  plugins: [],
};
export default config;
