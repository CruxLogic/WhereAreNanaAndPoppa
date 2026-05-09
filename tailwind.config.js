/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sky: {
          high: "#3D4A6B",
          mid: "#9A8A9E",
          peach: "#E5B89E",
          glow: "#F5D4B0",
          cream: "#F5E5CE",
        },
        parchment: {
          DEFAULT: "#F5EBD8",
          deep: "#E8D9BB",
          warm: "#FBF3DF",
        },
        ink: {
          DEFAULT: "#1B2A4E",
          soft: "#2C3E66",
          faint: "#5A6688",
          mute: "#8A93AB",
        },
        earth: {
          sienna: "#B98A5E",
          olive: "#9AA374",
          ochre: "#D4B271",
          shadow: "#7A5B3A",
        },
        ocean: {
          DEFAULT: "#3E5A6E",
          deep: "#243A4E",
          lit: "#7095AF",
        },
        vermillion: {
          DEFAULT: "#C4452F",
          deep: "#9C2F1D",
          glow: "#E07A65",
        },
        brass: {
          DEFAULT: "#C9924B",
          deep: "#8E6824",
          pale: "#E5C896",
        },
      },
      fontFamily: {
        display: ["Newsreader", "Georgia", "serif"],
        serif: ["Newsreader", "Georgia", "serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(27,42,78,0.06), 0 18px 36px -16px rgba(27,42,78,0.35), 0 2px 6px rgba(27,42,78,0.08)",
        seal: "0 2px 8px rgba(27,42,78,0.25), inset 0 0 0 2px #F5EBD8",
        panel: "0 30px 60px -20px rgba(20,28,52,0.5), 0 2px 0 rgba(27,42,78,0.05)",
      },
    },
  },
  plugins: [],
};
