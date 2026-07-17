"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { AccountSectionTabs } from "@/components/dashboard/AccountSectionTabs";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { authFetch, type OrganizerProfile, type OrganizerSession } from "@/lib/dashboard";
import { clearToken } from "@/lib/auth";

export default function DashboardSecurityPage() {
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [sessions, setSessions] = useState<OrganizerSession[]>([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const [meRes, sessionsRes] = await Promise.all([authFetch("/auth/me"), authFetch("/auth/sessions")]);
        if (meRes.ok) {
          const payload = (await meRes.json()) as { organizer?: OrganizerProfile };
          setProfile(payload.organizer ?? null);
          setSecurityAlerts(payload.organizer?.securityAlerts ?? true);
        }
        if (sessionsRes.ok) {
          const payload = (await sessionsRes.json()) as { sessions: OrganizerSession[] };
          setSessions(payload.sessions || []);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      pushToast("Le mot de passe doit contenir au moins 6 caracteres.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      pushToast("La confirmation ne correspond pas.", "error");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await authFetch("/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        pushToast(payload?.message ?? "Mise a jour impossible.", "error");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      pushToast("Mot de passe mis a jour.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function saveSecurity() {
    setSavingSecurity(true);
    try {
      const res = await authFetch("/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ securityAlerts })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        pushToast(payload?.message ?? "Enregistrement impossible.", "error");
        return;
      }
      const payload = (await res.json()) as { organizer?: OrganizerProfile };
      if (payload.organizer) {
        setProfile(payload.organizer);
        setSecurityAlerts(payload.organizer.securityAlerts ?? true);
      }
      pushToast("Preferences de securite enregistrees.");
    } finally {
      setSavingSecurity(false);
    }
  }

  async function revokeSessions() {
    const res = await authFetch("/auth/sessions", { method: "DELETE" });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      pushToast(payload?.message ?? "Deconnexion impossible.", "error");
      return;
    }
    clearToken();
    pushToast("Vous avez ete deconnecte de tous les appareils.");
    window.location.href = "/auth/login";
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-3 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:gap-5">
        <Header title="Securite" />

        <AccountSectionTabs active="security" />

        <section className="overflow-hidden rounded-[32px] border border-slate-800/70 bg-[linear-gradient(135deg,rgba(2,6,23,0.98),rgba(15,23,42,0.96),rgba(30,41,59,0.96))] p-5 text-white shadow-2xl shadow-slate-900/30 md:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.32em] text-white/55">Protection du compte</p>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Acces, sessions et alertes de securite</h1>
              <p className="max-w-2xl text-sm leading-6 text-white/72">
                Un espace isole pour renforcer l'acces au compte sans melanger les donnees de profil ni les parametres produits.
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Mot de passe</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Sessions</span>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-emerald-100">Alerte active</span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/50">Bloc</p>
                <p className="mt-1 text-lg font-semibold">Mot de passe</p>
                <p className="mt-1 text-xs text-white/60">Renover et verrouiller</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/50">Bloc</p>
                <p className="mt-1 text-lg font-semibold">Sessions</p>
                <p className="mt-1 text-xs text-white/60">Vue et deconnexion</p>
              </div>
              <div className="rounded-[22px] border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-emerald-50 backdrop-blur">
                <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-100/60">Bloc</p>
                <p className="mt-1 text-lg font-semibold">Alertes</p>
                <p className="mt-1 text-xs text-emerald-50/70">Connexion suspecte</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr,0.95fr]">
          <section className="space-y-4 rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Mot de passe</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Changer le mot de passe</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Le mot de passe doit rester fort, unique et utilise avec prudence.</p>
            </div>

            <form onSubmit={savePassword} className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Ancien mot de passe</label>
                <div className="flex gap-2">
                  <Input type={showCurrent ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="flex-1" />
                  <Button type="button" variant="ghost" className="rounded-2xl px-4" onClick={() => setShowCurrent(prev => !prev)}>{showCurrent ? "Cacher" : "Voir"}</Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nouveau mot de passe</label>
                <div className="flex gap-2">
                  <Input type={showNew ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="flex-1" />
                  <Button type="button" variant="ghost" className="rounded-2xl px-4" onClick={() => setShowNew(prev => !prev)}>{showNew ? "Cacher" : "Voir"}</Button>
                </div>
                <p className="text-xs text-slate-500">Minimum 6 caracteres, avec majuscules, minuscules, chiffres et symbole recommande.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Confirmer le mot de passe</label>
                <div className="flex gap-2">
                  <Input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="flex-1" />
                  <Button type="button" variant="ghost" className="rounded-2xl px-4" onClick={() => setShowConfirm(prev => !prev)}>{showConfirm ? "Cacher" : "Voir"}</Button>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" className="rounded-2xl px-5 py-3 text-sm" disabled={savingPassword}>{savingPassword ? "Mise a jour..." : "Mettre a jour"}</Button>
              </div>
            </form>
          </section>

          <section className="space-y-4 rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Alertes</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Notifications de securite</h2>
            </div>

            <div className="rounded-[22px] border border-slate-200/80 bg-slate-50 px-4 py-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">Alerte par email</p>
                  <p className="text-sm text-slate-600">Recevoir un email en cas de connexion suspecte.</p>
                </div>
                <input type="checkbox" className="h-5 w-5 accent-slate-900" checked={securityAlerts} onChange={e => setSecurityAlerts(e.target.checked)} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[18px] border border-white bg-white px-4 py-3 text-sm text-slate-700">
                <span>{profile?.email || "Compte connecte"}</span>
                <Button type="button" variant="ghost" className="rounded-2xl px-4" onClick={saveSecurity} disabled={savingSecurity}>{savingSecurity ? "Enregistrement..." : "Enregistrer"}</Button>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200/80 bg-slate-50 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Sessions actives</p>
              <div className="mt-3 space-y-3 text-sm">
                {loading ? (
                  <p className="text-slate-600">Chargement...</p>
                ) : sessions.length === 0 ? (
                  <p className="text-slate-600">Aucune session detectee.</p>
                ) : (
                  sessions.map(session => (
                    <div key={session.id} className="rounded-[18px] border border-white bg-white px-4 py-3 shadow-sm">
                      <p className="font-semibold text-slate-900">{session.device}</p>
                      <p className="mt-1 text-slate-500">{session.location || session.ip || "Position inconnue"}</p>
                      <p className="text-slate-400">{session.lastActive ? new Date(session.lastActive).toLocaleString("fr-FR") : "Activite recente"}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" className="rounded-2xl px-5 py-3 text-sm" onClick={revokeSessions}>Deconnecter tous les appareils</Button>
              <Link href="/dashboard/profile" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5">Aller au profil</Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}




