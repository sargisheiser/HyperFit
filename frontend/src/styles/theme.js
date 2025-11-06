/**
 * HyperFit Theme Configuration
 * Cyberpunk-inspired color palette and design tokens
 */

export const theme = {
  colors: {
    // Primary Neon Colors
    primary: '#00FF88',        // Green
    secondary: '#9D4EDD',      // Magenta/Purple
    accent: '#00FFFF',         // Cyan
    warning: '#FF007F',        // Hot Pink
    
    // Legacy support (for existing components)
    green: '#00FF00',
    magenta: '#FF00FF',
    cyan: '#00FFFF',
    
    // Background
    background: {
      dark: '#000000',
      darker: '#0a0a0a',
      card: '#111111'
    },
    
    // Text
    text: {
      primary: '#FFFFFF',
      secondary: '#CCCCCC',
      muted: '#888888'
    },
    
    // Borders
    border: {
      primary: '#00FF88',
      secondary: '#9D4EDD',
      accent: '#00FFFF',
      default: '#333333'
    }
  },
  
  fonts: {
    primary: "'Orbitron', sans-serif",      // Headers
    secondary: "'Rajdhani', sans-serif",    // UI Text
    mono: "'VT323', monospace",             // Terminal/Code
    display: "'VT323', monospace"           // Cyberpunk display
  },
  
  shadows: {
    neon: {
      green: '0 0 10px rgba(0, 255, 136, 0.5), 0 0 20px rgba(0, 255, 136, 0.3)',
      magenta: '0 0 10px rgba(157, 78, 221, 0.5), 0 0 20px rgba(157, 78, 221, 0.3)',
      cyan: '0 0 10px rgba(0, 255, 255, 0.5), 0 0 20px rgba(0, 255, 255, 0.3)',
      pink: '0 0 10px rgba(255, 0, 127, 0.5), 0 0 20px rgba(255, 0, 127, 0.3)'
    },
    glow: {
      green: '0 0 15px rgba(0, 255, 136, 0.8), inset 0 0 15px rgba(0, 255, 136, 0.2)',
      magenta: '0 0 15px rgba(157, 78, 221, 0.8), inset 0 0 15px rgba(157, 78, 221, 0.2)',
      cyan: '0 0 15px rgba(0, 255, 255, 0.8), inset 0 0 15px rgba(0, 255, 255, 0.2)'
    }
  },
  
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem'
  },
  
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },
  
  animations: {
    glow: 'glow 2s ease-in-out infinite alternate',
    scan: 'scan 3s linear infinite',
    pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
  }
}

export default theme


