/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        govuk: {
          navy: "#0b0c0c",
          dark: "#0b0c0c",
          blue: "#1d70b8",
          blueHover: "#003078",
          lightBlue: "#e8f1f8",
          slate: "#f3f2f1",
          grey: "#f3f2f1",
          border: "#b1b4b6",
          darkBorder: "#2e3846",
          green: "#00703c",
          greenLight: "#d5f3e2",
          red: "#d4351c",
          redLight: "#fbebe8",
          amber: "#f47738",
          amberLight: "#fdf1e8",
          textSecondary: "#505a5f",
        },
        caf: {
          achieved: "#00703c",
          partially: "#f47738",
          notachieved: "#d4351c",
          notstarted: "#6f777b",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "\"Segoe UI\"",
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "\"Fira Sans\"",
          "\"Droid Sans\"",
          "\"Helvetica Neue\"",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
