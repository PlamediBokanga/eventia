"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { AccountSectionTabs } from "@/components/dashboard/AccountSectionTabs";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { authFetch, type OrganizerProfile, type OrganizerSession } from "@/lib/dashboard";
import { logoutSession } from "@/lib/authClient";

function passwordChecks(value: string) {
  return [
    { label: "6 caractères minimum", passed: value.length >= 6 },
    { label: "Une minuscule", passed: /[a-z]/.test(value) },
    { label: "Une majuscule", passed: /[A-Z]/.test(value) },
    { label: "Un chiffre", passed: /[0-9]/.test(value) },
    { label: "Un caractère spécial", passed: /[^A-Za-z0-9]/.test(value) },
    { label: "72 octets maximum", passed: new TextEncoder().encode(value).length <= 72 }
  ];
}

function formatDate(value?: string | null) {
  if (!value) return "Date inconnue";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date inconnue"
    : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

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
  const [loggingOut, setLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sessionsError, setSessionsError] = useState(false);
  const [reload, setReload] = useState(0);
  const { pushToast } = useToast();
  const checks = passwordChecks(newPassword);
  const passwordValid = checks.every(check => check.passed);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setLoadError(false);
      setSessionsError(false);
      const [meResult, sessionsResult] = await Promise.allSettled([
        authFetch("/auth/me"),
        authFetch("/auth/sessions")
      ]);
      if (!active) return;

      if (meResult.status === "fulfilled" && meResult.value.ok) {
        const payload = (await meResult.value.json()) as { organizer?: OrganizerProfile };
        if (active) {
          setProfile(payload.organizer ?? null);
          setSecurityAlerts(payload.organizer?.securityAlerts ?? true);
        }
      } else {
        setLoadError(true);
      }

      if (sessionsResult.status === "fulfilled" && sessionsResult.value.ok) {
        const payload = (await sessionsResult.value.json()) as { sessions?: OrganizerSession[] };
        if (active) setSessions(payload.sessions ?? []);
      } else {
        setSessionsError(true);
      }
      if (active) setLoading(false);
    }
    void load().catch(() => {
      if (active) {
        setLoadError(true);
        setSessionsError(true);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [reload]);

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    if (!currentPassword) {
      pushToast("Saisissez votre mot de passe actuel.", "error");
      return;
    }
    if (!passwordValid) {
      pushToast("Le nouveau mot de passe ne respecte pas encore tous les critères.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      pushToast("La confirmation ne correspond pas au nouveau mot de passe.", "error");
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
        pushToast(payload?.message ?? "La mise à jour du mot de passe a échoué.", "error");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      pushToast("Mot de passe mis à jour.");
    } catch {
      pushToast("Serveur injoignable. Réessayez dans quelques instants.", "error");
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
        pushToast(payload?.message ?? "Impossible d’enregistrer cette préférence.", "error");
        return;
      }
      const payload = (await res.json()) as { organizer?: OrganizerProfile };
      if (payload.organizer) setProfile(payload.organizer);
      pushToast("Préférence de sécurité enregistrée.");
    } catch {
      pushToast("Serveur injoignable. Réessayez dans quelques instants.", "error");
    } finally {
      setSavingSecurity(false);
    }
  }

  async function signOutThisDevice() {
    setLoggingOut(true);
    try {
      await logoutSession();
      window.location.assign("/auth/login");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <main className="space-y-6 pb-8 font-sans">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <Header title="Sécurité" description="Protégez l’accès à votre compte et vérifiez vos connexions récentes." />
        <AccountSectionTabs active="security" />

        {loadError ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
            <p className="text-sm font-medium text-rose-900">Certaines informations de sécurité n’ont pas pu être chargées.</p>
            <Button type="button" variant="ghost" className="min-h-11" onClick={() => setReload(value => value + 1)}>Réessayer</Button>
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Identifiants</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Changer le mot de passe</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Utilisez un mot de passe unique que vous n’utilisez pas sur un autre site.</p>
            </div>

            <form onSubmit={savePassword} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="current-password" className="text-sm font-medium text-slate-800">Mot de passe actuel</label>
                <div className="flex gap-2">
                  <Input id="current-password" autoComplete="current-password" type={showCurrent ? "text" : "password"} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="min-h-11 flex-1" required />
                  <button type="button" className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50" aria-label={showCurrent ? "Masquer le mot de passe actuel" : "Afficher le mot de passe actuel"} onClick={() => setShowCurrent(value => !value)}>{showCurrent ? "Masquer" : "Afficher"}</button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="new-password" className="text-sm font-medium text-slate-800">Nouveau mot de passe</label>
                <div className="flex gap-2">
                  <Input id="new-password" autoComplete="new-password" type={showNew ? "text" : "password"} value={newPassword} onChange={event => setNewPassword(event.target.value)} className="min-h-11 flex-1" aria-describedby="password-rules" required />
                  <button type="button" className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50" aria-label={showNew ? "Masquer le nouveau mot de passe" : "Afficher le nouveau mot de passe"} onClick={() => setShowNew(value => !value)}>{showNew ? "Masquer" : "Afficher"}</button>
                </div>
                <ul id="password-rules" className="grid gap-1.5 pt-1 text-xs sm:grid-cols-2" aria-live="polite">
                  {checks.map(check => (
                    <li key={check.label} className={check.passed ? "font-medium text-emerald-800" : "text-slate-500"}>
                      <span aria-hidden="true" className="mr-2">{check.passed ? "✓" : "○"}</span>{check.label}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm-password" className="text-sm font-medium text-slate-800">Confirmer le nouveau mot de passe</label>
                <div className="flex gap-2">
                  <Input id="confirm-password" autoComplete="new-password" type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="min-h-11 flex-1" required />
                  <button type="button" className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50" aria-label={showConfirm ? "Masquer la confirmation" : "Afficher la confirmation"} onClick={() => setShowConfirm(value => !value)}>{showConfirm ? "Masquer" : "Afficher"}</button>
                </div>
                {confirmPassword && confirmPassword !== newPassword ? <p className="text-xs font-medium text-rose-800" role="alert">Les mots de passe ne correspondent pas.</p> : null}
              </div>

              <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={savingPassword || loading || !passwordValid || newPassword !== confirmPassword || !currentPassword}>
                {savingPassword ? "Mise à jour…" : "Mettre à jour le mot de passe"}
              </Button>
            </form>
          </section>

          <div className="space-y-5">
            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Notifications de sécurité</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Préférences d’alerte</h2>
              </div>
              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Alertes de sécurité par e-mail</span>
                  <span className="mt-1 block break-all text-sm text-slate-600">{profile?.email ?? "Adresse du compte"}</span>
                </span>
                <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-slate-900" checked={securityAlerts} onChange={event => setSecurityAlerts(event.target.checked)} disabled={loading || savingSecurity} />
              </label>
              <p className="text-xs leading-5 text-slate-500">Cette préférence est enregistrée sur votre compte. L’envoi effectif d’alertes dépend de la configuration du service e-mail.</p>
              <Button type="button" variant="ghost" className="min-h-11 w-full sm:w-auto" onClick={saveSecurity} disabled={loading || savingSecurity || loadError}>
                {savingSecurity ? "Enregistrement…" : "Enregistrer la préférence"}
              </Button>
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Historique</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Connexions récentes</h2>
                </div>
                <button type="button" className="min-h-10 self-start rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:self-auto" onClick={() => setReload(value => value + 1)} disabled={loading}>Actualiser</button>
              </div>
              <p className="text-sm leading-6 text-slate-600">Historique des dernières connexions réussies, pas une liste de sessions actuellement actives.</p>
              {loading ? (
                <div className="h-16 animate-pulse rounded-2xl bg-slate-100" role="status">Chargement…</div>
              ) : sessionsError ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-900" role="alert">Impossible de charger l’historique des connexions.</p>
              ) : sessions.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Aucune connexion récente enregistrée.</p>
              ) : (
                <ul className="space-y-2">
                  {sessions.map(session => (
                    <li key={session.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="break-words text-sm font-semibold text-slate-900">{session.device || "Navigateur"}</p>
                      <p className="mt-1 text-xs text-slate-600">{session.ip ? `Adresse IP : ${session.ip}` : "Adresse IP non disponible"}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(session.lastActive)}</p>
                    </li>
                  ))}
                </ul>
              )}
              <Button type="button" variant="ghost" className="min-h-11 w-full" onClick={() => void signOutThisDevice()} disabled={loggingOut}>
                {loggingOut ? "Déconnexion…" : "Se déconnecter de cet appareil"}
              </Button>
              <Link href="/dashboard/profile" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">Gérer mon profil</Link>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
