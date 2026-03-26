import type { CSSProperties } from "react";

type ThemeEvent = {
  themePreset?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  fontFamily?: string | null;
  animationStyle?: string | null;
};

function presetColors(preset?: string | null) {
  const normalized = (preset || "").toLowerCase();
  if (normalized === "elegant") {
    return { primary: "#1F2A44", accent: "#C08B3F" };
  }
  if (normalized === "vibrant") {
    return { primary: "#0F5E9C", accent: "#E76F51" };
  }
  if (normalized === "minimal") {
    return { primary: "#3A3A3A", accent: "#7A7A7A" };
  }
  return { primary: "#0B1C2C", accent: "#9B6B2F" };
}

function safeColor(value?: string | null, fallback?: string) {
  if (!value) return fallback || "#0B1C2C";
  const v = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback || "#0B1C2C";
}

export function getInvitationThemeStyle(event?: ThemeEvent | null): CSSProperties {
  const preset = presetColors(event?.themePreset);
  const primary = safeColor(event?.primaryColor, preset.primary);
  const accent = safeColor(event?.accentColor, preset.accent);
  const font = event?.fontFamily?.trim() || "Inter, system-ui, sans-serif";
  return {
    ["--invite-primary" as string]: primary,
    ["--invite-accent" as string]: accent,
    ["--invite-font" as string]: font
  } as CSSProperties;
}

export function getInvitationAnimationClass(style?: string | null) {
  const normalized = (style || "").toLowerCase();
  if (normalized === "float") return "invite-anim-float";
  if (normalized === "soft") return "invite-anim-soft";
  return "";
}
