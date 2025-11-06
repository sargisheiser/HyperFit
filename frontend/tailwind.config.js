/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          primary: '#00ff41',
          secondary: '#ff0080',
          accent: '#00d4ff',
          dark: '#0a0a0a',
          darker: '#000000',
          gray: '#1a1a1a',
          'gray-light': '#2a2a2a',
          neon: {
            green: '#00ff41',
            pink: '#ff0080',
            cyan: '#00d4ff',
            purple: '#9d00ff',
            yellow: '#ffd700',
          }
        },
        brutal: {
          black: '#000000',
          white: '#ffffff',
          red: '#ff0000',
          yellow: '#ffff00',
          blue: '#0000ff',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
        display: ['Orbitron', 'Impact', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        cyber: ['VT323', 'monospace'],
      },
      boxShadow: {
        'neon-green': '0 0 20px rgba(0, 255, 65, 0.5), 0 0 40px rgba(0, 255, 65, 0.3)',
        'neon-pink': '0 0 20px rgba(255, 0, 128, 0.5), 0 0 40px rgba(255, 0, 128, 0.3)',
        'neon-cyan': '0 0 20px rgba(0, 212, 255, 0.5), 0 0 40px rgba(0, 212, 255, 0.3)',
        'brutal': '8px 8px 0px rgba(0, 0, 0, 1)',
        'brutal-lg': '12px 12px 0px rgba(0, 0, 0, 1)',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 3s linear infinite',
        'pulse-neon': 'pulse-neon 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 255, 65, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 255, 65, 0.8), 0 0 30px rgba(0, 255, 65, 0.6)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'pulse-neon': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
      },
      backgroundImage: {
        'grid': 'linear-gradient(rgba(0, 255, 65, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 65, 0.1) 1px, transparent 1px)',
        'grid-dark': 'linear-gradient(rgba(0, 255, 65, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 65, 0.05) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '50px 50px',
      },
    },
  },
  plugins: [],
}