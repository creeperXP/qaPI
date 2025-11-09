/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: '#00ffff',
          pink: '#ff00ff',
          purple: '#9d00ff',
          blue: '#0066ff',
          green: '#00ff88',
        },
        dark: {
          bg: '#0a0a0f',
          card: '#151520',
          border: '#1a1a2e',
        },
        light: {
          bg: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
        }
      },
      backgroundImage: {
        'gradient-neon': 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
        'gradient-cyber': 'linear-gradient(135deg, #0066ff 0%, #9d00ff 50%, #ff00ff 100%)',
        'gradient-light': 'linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, #f1f5f9 100%)',
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(0, 255, 255, 0.5)',
        'neon-pink': '0 0 20px rgba(255, 0, 255, 0.5)',
        'neon-purple': '0 0 20px rgba(157, 0, 255, 0.5)',
        'light-soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'light-medium': '0 4px 16px rgba(0, 0, 0, 0.12)',
      }
    },
  },
  plugins: [],
}



