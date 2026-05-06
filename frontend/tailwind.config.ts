import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-primary": "#080808",
        "bg-surface": "#111111",
        "bg-elevated": "#1A1A1A",
        "bg-border": "#2A2A2A",
        "accent-gold": "#E8C547",
        "accent-blue": "#3D7EFF",
        "text-primary": "#F0F0F0",
        "text-muted": "#888888",
      },
      fontFamily: {
        display: ["'Bebas Neue'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
      },
      boxShadow: {
        gold: "0 0 20px rgba(232, 197, 71, 0.15)",
        "gold-lg": "0 0 40px rgba(232, 197, 71, 0.25)",
        blue: "0 0 20px rgba(61, 126, 255, 0.2)",
      },
      animation: {
        "pulse-gold": "pulse-gold 3s ease-in-out infinite",
        "fade-up": "fade-up 0.4s ease-out both",
        "scale-in": "scale-in 0.3s ease-out both",
      },
      keyframes: {
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(232, 197, 71, 0.15)" },
          "50%": { boxShadow: "0 0 40px rgba(232, 197, 71, 0.4)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
