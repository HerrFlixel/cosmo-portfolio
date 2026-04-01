import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
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
        heading: ["Bebas Neue", "sans-serif"],
        body: ["IBM Plex Sans", "sans-serif"],
      },
      letterSpacing: {
        label: "0.2em",
        nav: "0.15em",
      },
    },
  },
  plugins: [],
};
export default config;
