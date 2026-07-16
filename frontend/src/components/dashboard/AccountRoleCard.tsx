"use client";

import type { OrganizerProfile } from "@/lib/dashboard";

type RoleKey = NonNullable<OrganizerProfile["role"]>;

const ROLE_LABELS: Record<RoleKey, { title: string; description: string }> = {
  user: {
    title: "Compte standard",
    description: "Acces general au dashboard"
  },
  organizer: {
    title: "Organisateur",
    description: "Pilotage des evenements et des invites"
  },
  agency: {
    title: "Agence",
    description: "Gestion multi-clients et collaboration"
  },
  company: {
    title: "Entreprise",
    description: "Parcours corporate et evenements internes"
  },
  superadmin: {
    title: "Super admin",
    description: "Gouvernance et supervision de la plateforme"
  }
};

function normalizeRole(value?: string | null): RoleKey {
  if (value === "user" || value === "organizer" || value === "agency" || value === "company" || value === "superadmin") {
    return value;
  }
  return "organizer";
}

export function AccountRoleCard({
  profile,
  fallbackName = "Compte Eventia"
}: {
  profile: OrganizerProfile | null;
  fallbackName?: string;
}) {
  const role = normalizeRole(profile?.role);
  const meta = ROLE_LABELS[role];

  return (
    <section className="rounded-[24px] border border-slate-200/80 bg-white px-4 py-4 shadow-sm">
      <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Type de compte</p>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-lg font-semibold text-slate-900">{meta.title}</p>
          <p className="text-sm leading-6 text-slate-600">{meta.description}</p>
        </div>
        <div className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
          {role}
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <span className="font-semibold text-slate-900">{profile?.name || fallbackName}</span>
        <span className="mx-2 text-slate-300">•</span>
        <span>{profile?.email || "Email non renseigne"}</span>
      </div>
    </section>
  );
}
