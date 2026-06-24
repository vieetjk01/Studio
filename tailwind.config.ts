import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Obsidian palette (from the Vieetjk Gallery design)
        bg: "#0a0a0c",
        bg2: "#0f0f12",
        surface: "#141417",
        surface2: "#1c1c20",
        ink: {
          950: "#0a0a0c",
          900: "#0f0f12",
          850: "#141417",
          800: "#1c1c20",
          700: "#26262d",
          600: "#33333c",
        },
        // text tokens
        fg: "#f4f3f1",
        accent: {
          DEFAULT: "#f4f3f1", // silver-white
          muted: "rgba(244,243,241,0.60)",
          faint: "rgba(244,243,241,0.36)",
          ink: "#0a0a0c",
          gold: "#E8C57C", // champagne accent
        },
        logo: "#C0151A", // red play triangle
      },
      borderColor: {
        subtle: "rgba(255,255,255,0.09)",
        strong: "rgba(255,255,255,0.18)",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "var(--font-hanken)", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
      },
      animation: {
        "vk-fade": "vkFade .6s ease both",
        "vk-pop": "vkPop .45s ease both",
        "vk-overlay": "vkOverlay .3s ease both",
        "vk-toast": "vkToast .35s ease both",
      },
      keyframes: {
        vkFade: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "none" },
        },
        vkPop: {
          from: { opacity: "0", transform: "scale(.985)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        vkOverlay: { from: { opacity: "0" }, to: { opacity: "1" } },
        vkToast: {
          from: { opacity: "0", transform: "translate(-50%,14px)" },
          to: { opacity: "1", transform: "translate(-50%,0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
