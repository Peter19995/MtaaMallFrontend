/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#51c4d8',
          dark: '#3a9eb0',
          light: '#8fd9e8'
        },
        secondary: {
          DEFAULT: '#ff8a5c',
          dark: '#e66a3a',
          light: '#ffb89a'
        },
        accent: {
          DEFAULT: '#9b6b9e',
          dark: '#7b4f7e',
          light: '#c39ac6'
        },
        background: '#f8fafc',
        surface: '#FFFFFF',
        text: {
          DEFAULT: '#1e2b32',
          secondary: '#4a5b66',
          tertiary: '#7f8e99',
          inverse: '#FFFFFF'
        },
        success: {
          DEFAULT: '#2e9a6e',
          dark: '#1f7a54',
          light: '#b8e6d0'
        },
        warning: {
          DEFAULT: '#ffae42',
          dark: '#e08c2a',
          light: '#ffe0b2'
        },
        error: {
          DEFAULT: '#e65c5c',
          dark: '#c43d3d',
          light: '#ffcdd2'
        },
        info: {
          DEFAULT: '#51c4d8',
          dark: '#3a9eb0',
          light: '#e0f2f7'
        },
        border: '#d9e2e9',
        divider: '#e6edf2'
      },
      borderRadius: {
        xs: '2px',
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        round: '9999px'
      }
    }
  },
  plugins: []
}
