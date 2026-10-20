/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand teal
        primary: {
          50:  '#E6F7F4',
          100: '#C2EBE4',
          200: '#99F6E4',
          300: '#5EEAD6',
          400: '#2DD4BF',
          500: '#0F9D8A',  // Main brand
          600: '#0B7F70',
          700: '#09665A',
          800: '#074D44',
          900: '#05352F',
        },
        // Accent orange (CTAs, prices, highlights)
        accent: {
          400: '#FFA94D',
          500: '#FF8A1F',
          600: '#E8730C',
          700: '#C65D05',
        },
        // Secondary indigo (links, info)
        secondary: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          500: '#5B5BD6',
          600: '#4747B8',
          700: '#383896',
        },
        // Gold for ratings
        gold: {
          DEFAULT: '#F5B301',
          400: '#FBBF24',
          500: '#F5B301',
        },
        // Neutrals (light)
        neutral: {
          50:  '#F6F8FA',
          100: '#F0F2F5',
          200: '#E5E9EE',
          300: '#D0D5DD',
          400: '#98A2B3',
          500: '#667085',
          600: '#475467',
          700: '#344054',
          800: '#1D2939',
          900: '#101828',
        },
        // Dark theme tokens
        dark: {
          bg:      '#0B1220',
          surface: '#131C2E',
          card:    '#182438',
          border:  '#25314A',
          text:    '#F1F5F9',
          muted:   '#94A3B8',
        },
        // Semantics
        success: {
          DEFAULT: '#16A34A',
          50: '#F0FDF4',
          500: '#16A34A',
          600: '#15803D',
        },
        warning: {
          DEFAULT: '#F59E0B',
          50: '#FFFBEB',
          500: '#F59E0B',
          600: '#D97706',
        },
        danger: {
          DEFAULT: '#E5484D',
          50: '#FEF2F2',
          500: '#E5484D',
          600: '#DC2626',
        },
        info: {
          DEFAULT: '#2563EB',
          50: '#EFF6FF',
          500: '#2563EB',
          600: '#1D4ED8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',  // 12px
        '2xl': '1rem',  // 16px
        '3xl': '1.5rem', // 24px
      },
      boxShadow: {
        card: '0 2px 8px -2px rgba(16, 24, 40, 0.06), 0 1px 4px -1px rgba(16, 24, 40, 0.04)',
        'card-hover': '0 12px 24px -4px rgba(16, 24, 40, 0.12), 0 4px 8px -2px rgba(16, 24, 40, 0.06)',
        'card-dark': '0 4px 16px -2px rgba(0, 0, 0, 0.4)',
        'card-hover-dark': '0 16px 32px -4px rgba(0, 0, 0, 0.6)',
        glow: '0 0 20px rgba(15, 157, 138, 0.35)',
        'glow-accent': '0 0 20px rgba(255, 138, 31, 0.35)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #0F9D8A 0%, #12C2A8 100%)',
        'warm-gradient': 'linear-gradient(135deg, #FF8A1F 0%, #FF5E62 100%)',
        'soft-tint': 'linear-gradient(180deg, #E6F7F4 0%, #FFFFFF 100%)',
      },
    },
  },
  plugins: [],
};
