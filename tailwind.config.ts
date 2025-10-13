import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#0f172a'
        }
      },
      boxShadow: {
        card: '0 20px 45px -24px rgba(15, 23, 42, 0.45)'
      }
    }
  },
  plugins: []
};

export default config;
