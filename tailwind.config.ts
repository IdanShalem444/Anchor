import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Anchor accent — used sparingly
        anchor: {
          DEFAULT: "#fb5c3d",
          50: "#fff4f1",
          100: "#ffe6e0",
          200: "#ffccc0",
          300: "#ffa896",
          400: "#fd7a5f",
          500: "#fb5c3d",
          600: "#e83f1f",
          700: "#c33015",
          800: "#a12c16",
          900: "#852a19",
        },
        ink: {
          DEFAULT: "#16181d",
          soft: "#3a3f4a",
          muted: "#6b7280",
          faint: "#9aa1ad",
        },
        glass: {
          DEFAULT: "rgba(255,255,255,0.65)",
          strong: "rgba(255,255,255,0.82)",
          line: "rgba(255,255,255,0.6)",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Segoe UI",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
        "4xl": "32px",
      },
      boxShadow: {
        glass: "0 8px 32px -8px rgba(22,24,29,0.12), 0 2px 8px -2px rgba(22,24,29,0.06)",
        soft: "0 4px 24px -6px rgba(22,24,29,0.10)",
        lift: "0 18px 48px -12px rgba(22,24,29,0.18)",
        glow: "0 8px 30px -6px rgba(251,92,61,0.35)",
        inset: "inset 0 1px 0 0 rgba(255,255,255,0.6)",
      },
      backdropBlur: {
        xs: "2px",
        "2xl": "30px",
        "3xl": "44px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        aurora: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(3%,-4%) scale(1.05)" },
          "66%": { transform: "translate(-3%,3%) scale(0.97)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease forwards",
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) forwards",
        "scale-in": "scale-in 0.4s cubic-bezier(0.22,1,0.36,1) forwards",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        aurora: "aurora 24s ease-in-out infinite",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.22,1,0.36,1)",
      },
    },
  },
  plugins: [],
};

export default config;
