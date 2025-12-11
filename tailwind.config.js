/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
    theme: {
    extend: {
    colors: {
    // custom tokens requested
    primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    300: '#86efac',
    500: '#34d399', // success (brighter emerald)
    },
    emerald: {
    400: '#34d399'
    },
    danger: {
    400: '#f87171'
    },
    amber: {
    400: '#f59e0b',
    500: '#fbbf24'
    },
    info: {
    400: '#3b82f6',
    300: '#60a5fa'
    },
    warmGray: {
    900: '#0a0e1a',
    800: '#12162b',
    700: '#1a1f3a'
    }
    },
    boxShadow: {
    'emerald-glow': '0 6px 24px rgba(52,211,153,0.12)',
    'amber-glow': '0 6px 24px rgba(251,191,36,0.12)'
    }
    }
    },
    plugins: [],
    };