import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // App Custom Color Palette
        "app-green": {
          DEFAULT: "#3F592E",
          dark: "#4A2E59",
        },
        "app-plumb":"#4A2E59",
        "app-taupe": "#C4B7A6",
        "app-cream": "#F8F6F3",
        "app-white": "#FFFFFF",
        "app-charcoal": "#59572E",
        "app-gray": "#7A7A7A",
        "app-red": "#791D1E",
        "app-teal": "#104B55",
        "app-border": "#E8E4DF",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "app": "0 2px 8px rgba(61, 61, 61, 0.08)",
        "app-lg": "0 4px 16px rgba(61, 61, 61, 0.12)",
      },
      borderRadius: {
        "app": "12px",
      },
    },
  },
  plugins: [],
};

export default config;