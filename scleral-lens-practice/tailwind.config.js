/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        paper: "#F5F7F9",
        ink: "#111827",
        card: "#FFFFFF",
        border: "#E2E8EC",
        slate: "#64748B",
        focus: "#0D9488",
        focusSoft: "#CCFBF1",
        lens: "#2563EB",
        lensSoft: "#DBEAFE",
        good: "#15803D",
        goodSoft: "#DCFCE7",
        warn: "#B91C1C",
        warnSoft: "#FEE2E2",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
