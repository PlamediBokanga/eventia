"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { authFetch, type OrganizerProfile } from "@/lib/dashboard";
import { getVisibleMenuSections, NavIcon, ROLE_META, type DashboardRole } from "./dashboardNav";

export function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const [role, setRole] = useState<DashboardRole>("organizer");

  useEffect(() => {
    let alive = true;

    async function loadRole() {
      const res = await authFetch("/auth/me");
      if (!res.ok || !alive) return;
      const payload = (await res.json()) as { organizer?: OrganizerProfile };
      const value = payload.organizer?.role;
      if (value && value in ROLE_META) {
        setRole(value as DashboardRole);
      }
    }

    void loadRole();
    return () => {
      alive = false;
    };
  }, []);

  const menuSections = useMemo(() => getVisibleMenuSections(role), [role]);
  const roleMeta = ROLE_META[role];

  const navClass = mobile ? "grid grid-cols-2 gap-2 text-xs" : "space-y-5 text-sm";

  const wrapperClass = mobile
    ? "bg-primary text-white rounded-2xl p-3"
    : "w-64 bg-primary text-white min-h-screen p-6";

  return (
    <aside className={wrapperClass}>
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-white">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Espace connecté</p>
        <p className="mt-1 text-sm font-semibold">{roleMeta.label}</p>
        <p className="text-[11px] text-white/70">{roleMeta.description}</p>
      </div>
      <nav className={navClass}>
        {menuSections.map(section => (
          <div key={section.title} className={mobile ? "space-y-2" : "space-y-2"}>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">{section.title}</p>
            <div className={mobile ? "grid grid-cols-2 gap-2" : "space-y-1"}>
              {section.items.map(item => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname?.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 transition ${
                      active
                        ? "bg-white text-primary font-semibold shadow-sm"
                        : "text-white/90 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-white/80">
                      <NavIcon type={item.icon} />
                    </span>
                    <span className="whitespace-nowrap">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
