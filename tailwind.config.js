/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface:   "#0D0D0D",
        card:      "#141414",
        border:    "#1F1F1F",
        muted:     "#2A2A2A",
        primary:   "#F0F0F0",
        secondary: "#888888",
        blue: {
          DEFAULT: "#5B7FFF",
          dim:     "#3D5FCC",
          glow:    "#5B7FFF33",
        },
        magenta: {
          DEFAULT: "#CC2ECC",
          dim:     "#991F99",
          glow:    "#CC2ECC33",
        },
        success: "#22C55E",
        warning: "#F59E0B",
        danger:  "#EF4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
