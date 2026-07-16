"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authFetch, type OrganizerProfile } from "@/lib/dashboard";
import { clearToken } from "@/lib/authClient";
import { ROLE_META, type DashboardRole } from "@/components/layout/dashboardNav";
import { EmptyState } from "@/components/ui/EmptyState";

function normalizeRole(value?: string | null): DashboardRole {
  if (value === "user" || value === "organizer" || value === "agency" || value === "company" || value === "superadmin") {
    return value;
  }
  return "organizer";
}

export function DashboardRoleGate({
  allowedRoles,
  title,
  description,
  children
}: {
  allowedRoles: DashboardRole[];
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await authFetch("/auth/me");
        if (!res.ok || !alive) return;
        const payload = (await res.json()) as { organizer?: OrganizerProfile };
        setProfile(payload.organizer ?? null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="space-y-4">
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">Chargement...</p>
        </div>
      </main>
    );
  }

  const role = normalizeRole(profile?.role);
  const allowed = allowedRoles.includes(role) || role === "superadmin";

  if (!allowed) {
    return (
      <main className="space-y-4">
        <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6">
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Acces protege</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 md:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        </section>
        <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6">
          <EmptyState
            title="Acces refuse"
            description={`Cette page est reservee aux comptes ${allowedRoles.map(r => ROLE_META[r].label.toLowerCase()).join(", ")}.`}
            action={<Link href="/dashboard" className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Retour au dashboard</Link>}
          />
        </section>
      </main>
    );
  }

  return <>{children}</>;
}

export function clearAllSessionsAndLogout() {
  clearToken();
  window.location.href = "/auth/login";
}
