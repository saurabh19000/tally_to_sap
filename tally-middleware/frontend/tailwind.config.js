/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'IBM Plex Mono'", "monospace"],
        sans: ["'IBM Plex Sans'", "sans-serif"],
      },
      colors: {
        ink: "#0a0c0f",
        panel: "#10141a",
        card: "#161c26",
        border: "#1e2733",
        accent: "#00d4ff",
        green: "#00e599",
        amber: "#ffb800",
        red: "#ff4757",
        muted: "#3a4a5c",
        dim: "#1e2a38",
      },
      animation: {
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "scan": "scan 3s linear infinite",
        "fade-up": "fade-up 0.4s ease-out forwards",
        "count-up": "count-up 0.6s ease-out forwards",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: 1, transform: "scale(1)" },
          "50%": { opacity: 0.5, transform: "scale(0.85)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(400%)" },
        },
        "fade-up": {
          from: { opacity: 0, transform: "translateY(10px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
