/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        m3: {
          primary: '#D0BCFF',
          'on-primary': '#381E72',
          'primary-container': '#4F378B',
          'on-primary-container': '#EADDFF',
          secondary: '#CCC2DC',
          'on-secondary': '#332D41',
          'secondary-container': '#4A4458',
          'on-secondary-container': '#E8DEF8',
          tertiary: '#70D6E2',
          'on-tertiary': '#00363D',
          'tertiary-container': '#004F58',
          'on-tertiary-container': '#8CF2FF',
          error: '#F2B8B5',
          'on-error': '#601410',
          'error-container': '#8C1D18',
          'on-error-container': '#F9DEDC',
          background: '#141218',
          'on-background': '#E6E0E9',
          surface: '#141218',
          'on-surface': '#E6E0E9',
          'surface-variant': '#49454F',
          'on-surface-variant': '#CAC4D0',
          outline: '#938F99',
          'outline-variant': '#49454F',
          // M3 Elevation / Tonal Surfaces
          'surface-container-lowest': '#0F0D13',
          'surface-container-low': '#1D1B20',
          'surface-container': '#211F26',
          'surface-container-high': '#2B2930',
          'surface-container-highest': '#36343B',
          // Analítico
          metric: {
            protein: '#80CBC4',
            carbs: '#FFD54F',
            fat: '#FF8A65',
            calories: '#90CAF9',
            deficit: '#81C784',
            surplus: '#E57373',
          },
        },
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Roboto Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
