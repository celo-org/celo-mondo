// Should mostly match styles/Color.ts
const colors = require('tailwindcss/colors');

module.exports = {
  darkMode: 'class',
  content: ['src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000000',
      white: '#ffffff',
      gray: colors.gray,
      blue: colors.blue,
      red: colors.red,
      yellow: {
        500: '#FCFF52', // Prosperity
      },
      purple: {
        50: '#F4EFFF',
        100: '#E9DFFF',
        200: '#D4BFFF',
        300: '#B490FF', // Lavender
        500: '#1E002B', // Fig
      },
      green: {
        200: '#BEEAA9',
        500: '#56DF7C', // Jade
        700: '#476520', // Forest
      },
      taupe: {
        100: '#FCF6F1', // Gypsum
        300: '#E7E3D4', // Sand
        400: '#C6C2B5',
        600: '#655947', // Wood
      },
    },
    fontFamily: {
      sans: ['var(--font-inter)', 'sans-serif'],
      serif: ['Garamond', 'serif'],
      mono: ['Courier New', 'monospace'],
    },
    extend: {
      screens: {
        all: '1px',
        xs: '480px',
      },
      spacing: {
        100: '26rem',
        112: '28rem',
        128: '32rem',
        144: '36rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
      boxShadow: {
        lg2: '0 8px 24px 0px rgba(2, 1, 10, 0.08)',
      },
    },
  },

  plugins: [require('daisyui')],

  daisyui: {
    themes: [
      {
        light: {
          primary: '#FCFF52',
          secondary: '#E7E3D4',
          accent: '#B490FF',
          neutral: '#ffffff',
          'base-100': '#ffffff',
          info: '#F4EFFF',
          success: '#56DF7C',
          warning: '#fcd34d',
          error: '#F77171',

          '--rounded-box': '0px',
          '--rounded-btn': '0px',
          '--rounded-badge': '0px',
        },
      },
    ],
    styled: true, // include daisyUI colors and design decisions for all components
    utils: true, // adds responsive and modifier utility classes
    logs: true, // Shows info about daisyUI version and used config in the console when building your CSS
  },
};
