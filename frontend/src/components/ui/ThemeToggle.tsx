"use client";

import { useEffect, useState } from "react";

type ThemeMode = "jour" | "soir";

const STORAGE_KEY = "eventia_theme_mode";

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("jour");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const initial = stored === "soir" ? "soir" : "jour";
    setMode(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  function toggle() {
    const next: ThemeMode = mode === "jour" ? "soir" : "jour";
    setMode(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn-ghost px-3 py-1.5 text-xs"
      aria-label="Changer le theme"
    >
      {mode === "jour" ? "Mode soir" : "Mode jour"}
    </button>
  );
}

