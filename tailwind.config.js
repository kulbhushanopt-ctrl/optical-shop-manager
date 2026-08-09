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
        paper: "#F7F5F0",
        ink: "#111827",
        card: "#FFFFFF",
        border: "#E7E3D9",
        slate: "#6B7280",
        focus: "#F2B705",
        lens: "#2563EB",
        lensSoft: "#DBEAFE",
        good: "#15803D",
        goodSoft: "#DCFCE7",
        warn: "#B91C1C",
        warnSoft: "#FEE2E2",
        focusSoft: "#FEF3C7",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
