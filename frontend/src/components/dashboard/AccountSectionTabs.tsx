"use client";

import Link from "next/link";

const tabs = [
  { href: "/dashboard/profile", label: "Profil", key: "profile" },
  { href: "/dashboard/settings", label: "Parametres", key: "settings" },
  { href: "/dashboard/security", label: "Securite", key: "security" }
] as const;

export function AccountSectionTabs({ active }: { active: (typeof tabs)[number]["key"] }) {
  return (
    <nav className="rounded-[28px] border border-white/70 bg-white/85 p-2 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
      <div className="grid gap-2 md:grid-cols-3">
        {tabs.map(tab => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={
                `inline-flex items-center justify-center rounded-[20px] px-4 py-3 text-sm font-semibold transition ` +
                (isActive
                  ? "bg-slate-950 text-white shadow-lg shadow-slate-900/20"
                  : "bg-slate-50 text-slate-700 hover:-translate-y-0.5 hover:bg-slate-100")
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}