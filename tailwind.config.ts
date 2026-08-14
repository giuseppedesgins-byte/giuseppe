import type { Config } from "tailwindcss";

/**
 * Giuseppe design system — placeholder tokens.
 * Swap `giuseppe.*` colors and fonts once final brand assets are ready.
 * Kept deliberately minimal/neutral to read as luxury editorial, not "startup SaaS."
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        giuseppe: {
          bg: "#F7F5F2", // warm off-white paper
          ink: "#141312", // near-black text
          line: "#E4E0D9", // hairline borders
          muted: "#8A8478",
          accent: "#1F1D1A",
          panel: "#FFFFFF",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "Helvetica Neue", "Arial", "sans-serif"],
      },
      letterSpacing: {
        widest2: "0.28em",
      },
      maxWidth: {
        editorial: "1600px",
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
