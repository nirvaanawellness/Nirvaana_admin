/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        serif: ['Tenor Sans', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        border: "#E6E2DE",
        input: "#E6E2DE",
        ring: "#B89D62",
        background: "#F9F8F6",
        foreground: "#2C2420",
        primary: {
          DEFAULT: "#B89D62",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#E6D6CC",
          foreground: "#2C2420",
        },
        destructive: {
          DEFAULT: "#C76B6B",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F2F0EB",
          foreground: "#6B5E55",
        },
        accent: {
          DEFAULT: "#88856A",
          foreground: "#FFFFFF",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#2C2420",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#2C2420",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(44, 36, 32, 0.05)",
        float: "0 10px 40px -10px rgba(44, 36, 32, 0.1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}