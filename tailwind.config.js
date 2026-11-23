import animate from "tailwindcss-animate";
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#070B17",
        surface: "#0F1528",
        surface2: "#161D35",
        line: "#232B47",
        sober: { DEFAULT: "#3DA9FF", glow: "#7CC8FF", deep: "#1660C9" },
        drunk: { DEFAULT: "#FF8A3D", glow: "#FFB27A", deep: "#D9531A" },
        good: "#34D399",
        bad: "#F87171",
        muted: "#8B93B0",
      },
      fontFamily: {
        sans: ["Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "system-ui", "sans-serif"],
      },
      borderRadius: { "2xl": "1.25rem", "3xl": "1.75rem" },
      boxShadow: {
        card: "0 10px 30px -12px rgba(0,0,0,0.6)",
        sober: "0 0 24px rgba(61,169,255,0.45)",
        drunk: "0 0 24px rgba(255,138,61,0.45)",
      },
    },
  },
  plugins: [animate],
};
