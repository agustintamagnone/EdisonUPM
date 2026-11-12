import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        jakarta: ["var(--font-jakarta)", "sans-serif"],
        inter: ["var(--font-inter)", "sans-serif"],
      },
      colors: {
        ink: {
          900: "#0f1b2d",
          700: "#334155",
          500: "#64748b",
          300: "#cbd5e1",
        },
        surface: {
          bg: "#f4f7fa",
          card: "#ffffff",
        },
        line: "#e4e9f0",
        brand: {
          "violet-true": "#4865ff",
          "violet-700": "#3144aa",
          "violet-true-50": "#e8ebfe",
          violet: "#7403f4",
          "violet-50": "#f2e8ff",
          gold: "#e6c400",
          "gold-400": "#ffcb22",
          "gold-50": "#fff7da",
          cyan: "#00adcc",
          "cyan-700": "#00869e",
          "cyan-50": "#e5f7fa",
        },
        status: {
          success: "#16a34a",
          "success-50": "#e7f6ec",
        },
      },
    },
  },
  plugins: [],
};

export default config;
