"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { logoutSession } from "@/lib/authClient";
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

  async function handleLogout() {
    await logoutSession();
    router.push("/auth/login");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          <span className="truncate text-sm font-semibold text-slate-800">{roleMeta.label}</span>
          <span className="hidden text-sm text-slate-400 sm:inline" aria-hidden="true">/</span>
          <span className="hidden truncate text-sm text-slate-500 sm:inline">{roleMeta.description}</span>
          </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLogout}
            className="min-h-10 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Se déconnecter
          </button>
          <button
            type="button"
            onClick={() => setOpen(prev => !prev)}
            aria-expanded={open}
            aria-label={open ? "Fermer le menu des modules" : "Ouvrir le menu des modules"}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <span className="flex h-5 w-5 items-center justify-center text-white/80">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </span>
            {open ? "Fermer" : "Modules"}
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
          <div role="dialog" aria-modal="true" aria-label="Navigation des modules" className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-slate-50 p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <p className="title-4">Menu</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-text transition hover:bg-slate-100"
                >
                  Se déconnecter
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
            <div className="mt-5 grid gap-3">
              {menuSections.map(section => (
                <div key={section.title} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
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
                          className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                            active
                              ? "bg-slate-950 text-white shadow-sm"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <span className={active ? "text-white" : "text-slate-500"}>
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
