import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#F9FAFB",
        text: "#1F2937",
        textSecondary: "#6B7280",
        textMuted: "#9CA3AF",
        accent: "#D4AF37",
        primary: "#0F172A",
        success: "#1B7F5F"
      },
      fontFamily: {
        serif: ["'Playfair Display'", "serif"],
        heading: ["'Playfair Display'", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
