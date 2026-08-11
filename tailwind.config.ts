import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#7A1B3D',
          dark: '#5A1230',
          light: '#A8355C',
        },
        accent: {
          DEFAULT: '#D4A017',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
