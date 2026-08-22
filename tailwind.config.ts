import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Trustworthy, modern palette. "brand" = deep teal-blue; "accent" = warm amber.
        brand: {
          50: "#eef6f9",
          100: "#d6e9f0",
          200: "#aed3e1",
          300: "#7bb6cd",
          400: "#4792b3",
          500: "#2b7593",
          600: "#225d78",
          700: "#1e4c61",
          800: "#1d4051",
          900: "#1b3745",
          950: "#0f232e",
        },
        accent: {
          50: "#fff8 ",
          100: "#fdecc8",
          400: "#f0b429",
          500: "#de911d",
          600: "#cb6e17",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,35,46,0.06), 0 4px 16px rgba(16,35,46,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
