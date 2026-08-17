/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        sage: {
          50: "#f4f6f3",
          100: "#e7ebe3",
          200: "#cfd8c8",
          300: "#adbca1",
          400: "#879a78",
          500: "#697d5a",
          600: "#526345",
          700: "#414f38",
          800: "#36402f",
          900: "#2d3628",
        },
      },
    },
  },
  plugins: [],
};
