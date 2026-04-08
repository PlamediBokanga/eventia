"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  authFetch,
  type OrganizerProfile,
  type OrganizerStats,
  type OrganizerSession,
  type OrganizerSettings
} from "@/lib/dashboard";
import { clearToken } from "@/lib/auth";

export default function DashboardSettingsPage() {
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [stats, setStats] = useState<OrganizerStats | null>(null);
  const [sessions, setSessions] = useState<OrganizerSession[]>([]);
  const [settings, setSettings] = useState<OrganizerSettings | null>(null);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [bio, setBio] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const { pushToast } = useToast();

  useEffect(() => {
    async function load() {
      const res = await authFetch("/auth/me");
      if (!res.ok) return;
      const data = (await res.json()) as { organizer: OrganizerProfile };
      setProfile(data.organizer);
      setName(data.organizer.name ?? "");
      setPhone(data.organizer.phone ?? "");
      setAvatarUrl(data.organizer.avatarUrl ?? "");
      setSecurityAlerts(data.organizer.securityAlerts ?? true);
      setCompanyName(data.organizer.companyName ?? "");
      setJobTitle(data.organizer.jobTitle ?? "");
      setAddressLine1(data.organizer.addressLine1 ?? "");
      setAddressLine2(data.organizer.addressLine2 ?? "");
      setCity(data.organizer.city ?? "");
      setPostalCode(data.organizer.postalCode ?? "");
      setCountry(data.organizer.country ?? "");
      setWebsite(data.organizer.website ?? "");
      setBio(data.organizer.bio ?? "");
      setDateOfBirth(data.organizer.dateOfBirth ? data.organizer.dateOfBirth.slice(0, 10) : "");
    }
    void load();
    void loadStats();
    void loadSessions();
    void loadSettings();
  }, []);

  async function loadStats() {
    const res = await authFetch("/auth/me/stats");
    if (!res.ok) return;
    setStats((await res.json()) as OrganizerStats);
  }

  async function loadSessions() {
    const res = await authFetch("/auth/sessions");
    if (!res.ok) return;
    const payload = (await res.json()) as { sessions: OrganizerSession[] };
    setSessions(payload.sessions || []);
  }

  async function loadSettings() {
    const res = await authFetch("/auth/settings");
    if (!res.ok) return;
    const payload = (await res.json()) as { settings: OrganizerSettings };
    setSettings(payload.settings);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch("/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          avatarUrl,
          companyName,
          jobTitle,
          addressLine1,
          addressLine2,
          city,
          postalCode,
          country,
          website,
          bio,
          dateOfBirth: dateOfBirth || null,
          securityAlerts
        })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        pushToast(payload?.message ?? "Mise a jour impossible.", "error");
        return;
      }
      const data = (await res.json()) as { organizer: OrganizerProfile };
      setProfile(data.organizer);
      pushToast("Profil mis a jour avec succes.");
    } finally {
      setSaving(false);
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

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    try {
      const res = await authFetch("/auth/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        pushToast(payload?.message ?? "Mise a jour impossible.", "error");
        return;
      }
      const payload = (await res.json()) as { settings: OrganizerSettings };
      setSettings(payload.settings);
      pushToast("Parametres enregistres.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    try {
      const res = await authFetch("/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
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

  async function handleAvatarUpload(file: File) {
    setUploadingAvatar(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
        reader.readAsDataURL(file);
      });
      const res = await authFetch("/auth/me/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, dataUrl })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        pushToast(payload?.message ?? "Upload impossible.", "error");
        return;
      }
      const payload = (await res.json()) as { avatarUrl?: string; organizer?: OrganizerProfile };
      if (payload.organizer) {
        setProfile(payload.organizer);
        setAvatarUrl(payload.organizer.avatarUrl ?? "");
      } else if (payload.avatarUrl) {
        setAvatarUrl(payload.avatarUrl);
      }
      pushToast("Photo mise a jour.");
    } catch {
      pushToast("Upload impossible.", "error");
    } finally {
      setUploadingAvatar(false);
    }
  }

  const initials =
    (profile?.name || profile?.email || "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(item => item[0]?.toUpperCase())
      .join("") || "U";

  return (
    <main className="space-y-4">
      <Header title="Profil Organisateur" />

      {!profile ? (
        <section className="card p-4">
          <p className="text-small">Chargement du profil...</p>
        </section>
      ) : (
        <>
          <section className="card p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="Avatar"
                  className="h-16 w-16 rounded-full object-cover border border-primary/10"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-text">
                  {initials}
                </div>
              )}
              <div>
                <p className="text-lg font-semibold">{profile.name || "Organisateur"}</p>
                <p className="text-small text-textMuted">{profile.email}</p>
                <p className="text-[11px] text-textMuted">
                  Membre depuis {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("fr-FR") : "-"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" className="px-3 py-2 text-xs">
                Modifier le profil
              </Button>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
            <div className="card p-4 space-y-4">
              <h3 className="title-4">Infos personnelles</h3>
              <form onSubmit={save} className="grid gap-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-3 items-center">
                  <label className="text-small">Photo</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      placeholder="URL photo (https://...)"
                      value={avatarUrl}
                      onChange={e => setAvatarUrl(e.target.value)}
                    />
                    <label className="btn-ghost px-3 py-2 text-xs cursor-pointer">
                      {uploadingAvatar ? "Upload..." : "Uploader"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) void handleAvatarUpload(file);
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input placeholder="Nom complet" value={name} onChange={e => setName(e.target.value)} />
                  <Input placeholder="Telephone" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input placeholder="Entreprise" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                  <Input placeholder="Fonction / Poste" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                </div>
                <Input placeholder="Adresse (ligne 1)" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} />
                <Input placeholder="Adresse (ligne 2)" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input placeholder="Ville" value={city} onChange={e => setCity(e.target.value)} />
                  <Input placeholder="Code postal" value={postalCode} onChange={e => setPostalCode(e.target.value)} />
                  <Input placeholder="Pays" value={country} onChange={e => setCountry(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input placeholder="Site web (https://...)" value={website} onChange={e => setWebsite(e.target.value)} />
                  <Input type="date" placeholder="Date de naissance" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                </div>
                <textarea
                  className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
                  rows={4}
                  placeholder="Bio / Informations complementaires"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                />
                <Button className="w-full sm:w-fit" disabled={saving}>
                  {saving ? "Sauvegarde..." : "Enregistrer les modifications"}
                </Button>
              </form>
            </div>

            <div className="space-y-4">
              <section className="card p-4 space-y-3">
                <h3 className="title-4">Securite</h3>
                <form onSubmit={savePassword} className="grid gap-2 text-xs">
                  <div className="grid grid-cols-1 gap-2">
                    <Input
                      type={showCurrent ? "text" : "password"}
                      placeholder="Ancien mot de passe"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                    />
                    <Input
                      type={showNew ? "text" : "password"}
                      placeholder="Nouveau mot de passe"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                    <Input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirmer le mot de passe"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2 text-[11px] text-textMuted">
                      <button type="button" className="underline" onClick={() => setShowCurrent(s => !s)}>
                        {showCurrent ? "Masquer" : "Afficher"} ancien
                      </button>
                      <button type="button" className="underline" onClick={() => setShowNew(s => !s)}>
                        {showNew ? "Masquer" : "Afficher"} nouveau
                      </button>
                      <button type="button" className="underline" onClick={() => setShowConfirm(s => !s)}>
                        {showConfirm ? "Masquer" : "Afficher"} confirmation
                      </button>
                    </div>
                  </div>
                  <Button className="w-full" disabled={savingPassword}>
                    {savingPassword ? "Mise a jour..." : "Changer le mot de passe"}
                  </Button>
                </form>
                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs text-text/80">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={securityAlerts}
                      onChange={e => setSecurityAlerts(e.target.checked)}
                    />
                    Recevoir un email en cas de connexion suspecte
                  </label>
                </div>
              </section>

              <section className="card p-4 space-y-3">
                <h3 className="title-4">Sessions actives</h3>
                {sessions.length === 0 ? (
                  <p className="text-small">Aucune session active detectee.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {sessions.map(session => (
                      <div key={session.id} className="rounded-xl border border-primary/10 bg-background/70 px-3 py-2">
                        <p className="font-medium">{session.device}</p>
                        <p className="text-[11px] text-text/60">
                          {session.ip ? `IP: ${session.ip}` : "IP inconnue"}
                          {session.lastActive ? ` • ${new Date(session.lastActive).toLocaleString("fr-FR")}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <Button type="button" variant="ghost" className="w-full" onClick={revokeSessions}>
                  Se deconnecter de tous les appareils
                </Button>
              </section>

              <section className="card p-4 space-y-3">
                <h3 className="title-4">Statistiques</h3>
                {!stats ? (
                  <p className="text-small">Chargement des stats...</p>
                ) : (
                  <div className="grid gap-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl border border-primary/10 bg-background/70 p-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-text/60">Evenements</p>
                        <p className="mt-1 text-lg font-semibold">{stats.totalEvents}</p>
                      </div>
                      <div className="rounded-xl border border-primary/10 bg-background/70 p-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-text/60">Invites</p>
                        <p className="mt-1 text-lg font-semibold">{stats.totalGuests}</p>
                      </div>
                      <div className="rounded-xl border border-primary/10 bg-background/70 p-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-text/60">Confirmes</p>
                        <p className="mt-1 text-lg font-semibold">{stats.confirmed}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-primary/10 bg-background/70 p-3 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span>En attente</span>
                        <span className="font-semibold">{stats.pending}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Annules</span>
                        <span className="font-semibold">{stats.canceled}</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-primary/10 bg-background/70 p-3 text-xs space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-text/60">Types d'evenements</p>
                      {Object.entries(stats.types).length === 0 ? (
                        <p className="text-small">Aucune donnee.</p>
                      ) : (
                        Object.entries(stats.types).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="capitalize">{key}</span>
                            <span className="font-semibold">{value}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </section>

          <section className="card p-4 space-y-4">
            <h3 className="title-4">Parametres</h3>
            {!settings ? (
              <p className="text-small">Chargement des parametres...</p>
            ) : (
              <form onSubmit={saveSettings} className="grid gap-4 text-xs">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-primary/10 bg-background/70 px-3 py-2">
                    <span>Email rappel evenement</span>
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={settings.emailNotifications}
                      onChange={e => setSettings({ ...settings, emailNotifications: e.target.checked })}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-primary/10 bg-background/70 px-3 py-2">
                    <span>Notifications messages</span>
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={settings.messageNotifications}
                      onChange={e => setSettings({ ...settings, messageNotifications: e.target.checked })}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-primary/10 bg-background/70 px-3 py-2">
                    <span>Alertes evenements</span>
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={settings.eventAlerts}
                      onChange={e => setSettings({ ...settings, eventAlerts: e.target.checked })}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-primary/10 bg-background/70 px-3 py-2">
                    <span>Notifications marketing</span>
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={settings.marketingNotifications}
                      onChange={e => setSettings({ ...settings, marketingNotifications: e.target.checked })}
                    />
                  </label>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-small">Langue</label>
                    <select
                      className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
                      value={settings.language}
                      onChange={e => setSettings({ ...settings, language: e.target.value })}
                    >
                      <option value="fr">Francais</option>
                      <option value="en">Anglais</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-small">Fuseau horaire</label>
                    <select
                      className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
                      value={settings.timezone}
                      onChange={e => setSettings({ ...settings, timezone: e.target.value })}
                    >
                      <option value="Africa/Kinshasa">Kinshasa (UTC+1)</option>
                      <option value="Africa/Lagos">Lagos (UTC+1)</option>
                      <option value="Africa/Abidjan">Abidjan (UTC+0)</option>
                      <option value="Europe/Paris">Paris (UTC+1)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-small">Format date</label>
                    <select
                      className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
                      value={settings.dateFormat}
                      onChange={e => setSettings({ ...settings, dateFormat: e.target.value })}
                    >
                      <option value="DD/MM/YYYY">JJ/MM/AAAA</option>
                      <option value="MM/DD/YYYY">MM/JJ/AAAA</option>
                      <option value="YYYY-MM-DD">AAAA-MM-JJ</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-small">Type evenement par defaut</label>
                    <select
                      className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
                      value={settings.defaultEventType}
                      onChange={e => setSettings({ ...settings, defaultEventType: e.target.value })}
                    >
                      <option value="mariage">Mariage</option>
                      <option value="anniversaire">Anniversaire</option>
                      <option value="gala">Gala</option>
                      <option value="corporate">Corporate</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-small">Heure par defaut</label>
                    <Input
                      type="time"
                      value={settings.defaultEventTime}
                      onChange={e => setSettings({ ...settings, defaultEventTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-small">QR code actif</label>
                    <select
                      className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
                      value={settings.defaultQrEnabled ? "yes" : "no"}
                      onChange={e => setSettings({ ...settings, defaultQrEnabled: e.target.value === "yes" })}
                    >
                      <option value="yes">Oui</option>
                      <option value="no">Non</option>
                    </select>
                  </div>
                </div>

                <Button className="w-full sm:w-fit" disabled={savingSettings}>
                  {savingSettings ? "Sauvegarde..." : "Enregistrer les parametres"}
                </Button>
              </form>
            )}
          </section>
        </>
      )}
    </main>
  );
}
