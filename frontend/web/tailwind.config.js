/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary teal/green palette
        primary: {
          50:  '#f0fdfb',
          100: '#ccfbf4',
          200: '#99f6e9',
          300: '#5eead6',
          400: '#2dd4be',
          500: '#0F9D8A',  // Main brand color
          600: '#0d8c7a',
          700: '#0a7062',
          800: '#095a4f',
          900: '#074a41',
        },
        // Neutral greys
        neutral: {
          50:  '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.08)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};
