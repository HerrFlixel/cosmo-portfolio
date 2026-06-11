import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Neues Design-System
        paper: "#F4F4F2",
        ink: "#111111",
        fog: "#9A9A96",
        hairline: "#E2E2DF",
        // Legacy (nur noch Admin-Bereich)
        bg: "#FFFFFF",
        surface: "#F5F5F5",
        primary: "#1D1D1B",
        secondary: "#555555",
        muted: "#999999",
        border: "#E0E0E0",
        accent: "#1D1D1B",
        "accent-hover": "#333333",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        // Legacy-Aliase, damit Admin-Markup (font-heading/font-body) weiter rendert
        heading: ["var(--font-sans)", "sans-serif"],
        body: ["var(--font-sans)", "sans-serif"],
      },
      letterSpacing: {
        label: "0.14em",
        nav: "0.02em",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(.16,1,.3,1)",
      },
    },
  },
  plugins: [],
};
export default config;
