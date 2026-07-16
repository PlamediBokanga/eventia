"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clearToken } from "@/lib/authClient";
import { authFetch, type OrganizerProfile } from "@/lib/dashboard";
import { getVisibleMenuSections, NavIcon, ROLE_META, type DashboardRole } from "./dashboardNav";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

  function handleLogout() {
    clearToken();
    router.push("/auth/login");
  }

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/95 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="title-4">Navigation</p>
          <p className="text-small text-textSecondary">Acces rapide aux modules du dashboard.</p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-text">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {roleMeta.label} · {roleMeta.description}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-text transition hover:bg-slate-100"
          >
            Se deconnecter
          </button>
          <button
            type="button"
            onClick={() => setOpen(prev => !prev)}
            aria-expanded={open}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-text transition hover:bg-slate-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-textSecondary">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </span>
            {open ? "Fermer le menu" : "Ouvrir le menu"}
          </button>
        </div>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/30"
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <p className="title-4">Menu</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-text transition hover:bg-slate-100"
                >
                  Se deconnecter
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-text transition hover:bg-slate-100"
                >
                  Fermer
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-4">
              {menuSections.map(section => (
                <div key={section.title} className="rounded-2xl border border-slate-100 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-textSecondary">
                    {section.title}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {section.items.map(item => {
                      const active =
                        pathname === item.href ||
                        (item.href !== "/dashboard" && pathname?.startsWith(`${item.href}/`));

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                            active
                              ? "bg-primary text-white shadow-sm"
                              : "text-text hover:bg-slate-100"
                          }`}
                        >
                          <span className={active ? "text-white" : "text-textSecondary"}>
                            <NavIcon type={item.icon} />
                          </span>
                          <span className="whitespace-nowrap">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
