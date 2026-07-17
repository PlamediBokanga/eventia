"use client";

import Link from "next/link";
import { ROLE_META, type DashboardRole } from "@/components/layout/dashboardNav";

const ROLE_HERO: Record<
  DashboardRole,
  {
    eyebrow: string;
    title: string;
    description: string;
    cta: string;
    href: string;
    chips: string[];
    gradient: string;
  }
> = {
  user: {
    eyebrow: "Acces general",
    title: "Vos invitations et l'espace public",
    description: "Parcourez les invitations, confirmez votre presence et ouvrez les espaces partages.",
    cta: "Voir mes invitations",
    href: "/dashboard/invitations",
    chips: ["Invitations", "RSVP", "Souvenirs"],
    gradient: "from-sky-500 via-cyan-500 to-emerald-500"
  },
  organizer: {
    eyebrow: "Espace organisateur",
    title: "Piloter les evenements de bout en bout",
    description: "Creation, gestion des invites, QR, statistiques et facturation regroupes au meme endroit.",
    cta: "Ouvrir les evenements",
    href: "/dashboard/events",
    chips: ["Evenements", "Invites", "KPI"],
    gradient: "from-slate-950 via-slate-800 to-slate-600"
  },
  agency: {
    eyebrow: "Espace agence",
    title: "Gerer plusieurs clients avec methode",
    description: "Centralisez les dossiers, les acces d'equipe, les marques et les campagnes sur plusieurs evenements.",
    cta: "Voir les parametres agence",
    href: "/dashboard/settings",
    chips: ["Multi-clients", "Permissions", "Branding"],
    gradient: "from-violet-600 via-fuchsia-500 to-sky-500"
  },
  company: {
    eyebrow: "Espace entreprise",
    title: "Une vitrine corporate, claire et sobre",
    description: "Composez des evenements internes ou publics avec un cadre premium, un controle fin et une image serieuse.",
    cta: "Aller au billing",
    href: "/dashboard/billing",
    chips: ["Corporate", "Abonnements", "Comite"],
    gradient: "from-slate-950 via-indigo-900 to-violet-700"
  },
  superadmin: {
    eyebrow: "Supervision plateforme",
    title: "Voir la sante produit, les paiements et les commissions",
    description: "Un tableau de bord de gouvernance pour suivre la monetisation, les comptes et la performance globale.",
    cta: "Ouvrir la gouvernance",
    href: "/dashboard/admin",
    chips: ["Revenus", "Commissions", "Validation"],
    gradient: "from-rose-500 via-red-500 to-orange-400"
  }
};

function normalizeRole(role?: string | null): DashboardRole {
  if (role === "user" || role === "organizer" || role === "agency" || role === "company" || role === "superadmin") {
    return role;
  }
  return "organizer";
}

export function DashboardRoleBanner({ role }: { role?: string | null }) {
  const normalizedRole = normalizeRole(role);
  const meta = ROLE_META[normalizedRole];
  const hero = ROLE_HERO[normalizedRole];

  return (
    <section className={`relative overflow-hidden rounded-[32px] border border-white/70 bg-gradient-to-br ${hero.gradient} p-5 text-white shadow-[0_30px_100px_rgba(15,23,42,0.18)] md:p-6`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_28%)]" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            {hero.eyebrow}
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">{hero.title}</h1>
          <p className="max-w-3xl text-sm leading-7 text-white/78 md:text-base">{hero.description}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px] lg:max-w-[460px]">
          {hero.chips.map(chip => (
            <div key={chip} className="rounded-[22px] border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur">
              {chip}
            </div>
          ))}
          <div className="rounded-[22px] border border-white/15 bg-white/10 px-4 py-3 backdrop-blur sm:col-span-2">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/60">Type de compte</p>
            <p className="mt-1 text-lg font-semibold">{meta.label}</p>
            <p className="text-sm text-white/72">{meta.description}</p>
          </div>
        </div>
      </div>

      <div className="relative mt-5 flex flex-wrap items-center gap-3">
        <Link href={hero.href} className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-50">
          {hero.cta}
        </Link>
        <Link href="/dashboard/profile" className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15">
          Ouvrir le profil
        </Link>
        <Link href="/dashboard/settings" className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15">
          Voir les preferences
        </Link>
      </div>
    </section>
  );
}
