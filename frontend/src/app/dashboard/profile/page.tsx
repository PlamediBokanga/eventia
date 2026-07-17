"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { AccountSectionTabs } from "@/components/dashboard/AccountSectionTabs";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { authFetch, type OrganizerProfile, type OrganizerStats } from "@/lib/dashboard";
import { normalizePublicUrl } from "@/lib/url";

function initials(value?: string | null) {
  const source = value?.trim() || "EA";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? "")
    .join("") || "EA";
}

export default function DashboardProfilePage() {
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [stats, setStats] = useState<OrganizerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { pushToast } = useToast();

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

  const displayAvatar = normalizePublicUrl(profile?.avatarUrl ?? avatarUrl);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, statsRes] = await Promise.all([authFetch("/auth/me"), authFetch("/auth/me/stats")]);
        if (profileRes.ok) {
          const payload = (await profileRes.json()) as { organizer: OrganizerProfile };
          const organizer = payload.organizer;
          setProfile(organizer);
          setName(organizer.name ?? "");
          setPhone(organizer.phone ?? "");
          setAvatarUrl(organizer.avatarUrl ?? "");
          setCompanyName(organizer.companyName ?? "");
          setJobTitle(organizer.jobTitle ?? "");
          setAddressLine1(organizer.addressLine1 ?? "");
          setAddressLine2(organizer.addressLine2 ?? "");
          setCity(organizer.city ?? "");
          setPostalCode(organizer.postalCode ?? "");
          setCountry(organizer.country ?? "");
          setWebsite(organizer.website ?? "");
          setBio(organizer.bio ?? "");
          setDateOfBirth(organizer.dateOfBirth ? organizer.dateOfBirth.slice(0, 10) : "");
        }
        if (statsRes.ok) {
          const payload = (await statsRes.json()) as { stats: OrganizerStats };
          setStats(payload.stats);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSave(e: React.FormEvent) {
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
          dateOfBirth: dateOfBirth || null
        })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        pushToast(payload?.message ?? "Mise a jour impossible.", "error");
        return;
      }
      const payload = (await res.json()) as { organizer?: OrganizerProfile };
      if (payload.organizer) {
        setProfile(payload.organizer);
        setAvatarUrl(payload.organizer.avatarUrl ?? "");
      }
      pushToast("Profil mis a jour avec succes.");
    } finally {
      setSaving(false);
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

  const summaryCards = useMemo(
    () => [
      { label: "Evenements", value: stats?.totalEvents ?? 0 },
      { label: "Invites", value: stats?.totalGuests ?? 0 },
      { label: "Confirmes", value: stats?.confirmed ?? 0 },
      { label: "En attente", value: stats?.pending ?? 0 }
    ],
    [stats]
  );

  const topTypes = useMemo(
    () => Object.entries(stats?.types ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 4),
    [stats]
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-3 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:gap-5">
        <Header title="Profil" />

        <AccountSectionTabs active="profile" />


                <section className="overflow-hidden rounded-[36px] border border-slate-900/10 bg-[linear-gradient(135deg,rgba(2,6,23,0.98),rgba(15,23,42,0.95),rgba(30,41,59,0.92))] text-white shadow-2xl shadow-slate-900/20">
          <div className="grid gap-0 lg:grid-cols-[1.05fr,0.95fr]">
            <div className="space-y-5 p-6 md:p-8">
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.32em] text-white/55">Compte organisateur</p>
                <h1 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-5xl">Votre profil Eventia, presente comme une vraie vitrine de marque.</h1>
                <p className="max-w-2xl text-sm leading-6 text-white/72">
                  Centralisez votre identite, votre societe, votre image publique et vos chiffres d'activite dans un espace qui ressemble a un tableau de bord premium.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Profil public</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Image de marque</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Coordonnees</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map(card => (
                  <div key={card.label} className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/50">{card.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 bg-white/5 p-6 backdrop-blur md:p-8 lg:border-l lg:border-t-0">
              <div className="flex h-full flex-col justify-between gap-6 rounded-[30px] border border-white/10 bg-white/8 p-5">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[26px] border border-white/10 bg-white/10 text-2xl font-semibold text-white">
                      {displayAvatar ? (
                        <img src={displayAvatar} alt="Avatar organisateur" className="h-full w-full object-cover" />
                      ) : (
                        <span>{initials(profile?.name ?? name)}</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Carte identite</p>
                      <p className="text-2xl font-semibold">{profile?.name || name || "Nom du compte"}</p>
                      <p className="break-all text-sm text-white/70">{profile?.email || "Email non renseigne"}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[20px] border border-white/10 bg-slate-950/40 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Role</p>
                      <p className="mt-1 font-semibold text-white">{profile?.jobTitle || jobTitle || "Organisateur principal"}</p>
                    </div>
                    <div className="rounded-[20px] border border-white/10 bg-slate-950/40 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Ville</p>
                      <p className="mt-1 font-semibold text-white">{city || "Kinshasa"}</p>
                    </div>
                    <div className="rounded-[20px] border border-white/10 bg-slate-950/40 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Code invitation</p>
                      <p className="mt-1 break-all font-semibold text-white">{profile?.referralCode || "Non active"}</p>
                    </div>
                    <div className="rounded-[20px] border border-white/10 bg-slate-950/40 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Site web</p>
                      <p className="mt-1 break-all font-semibold text-white">{website || "Aucun"}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm leading-6 text-white/70">
                  Ce profil alimente vos invitations, votre presentation publique et votre signature sur la plateforme.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <form onSubmit={handleSave} className="space-y-4 rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Photo et identite</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Votre vitrine personnelle</h2>
              </div>
              <div className="flex items-center gap-3 rounded-[22px] border border-slate-200/80 bg-slate-50 px-4 py-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-950 text-lg font-semibold text-white">
                  {displayAvatar ? (
                    <img src={displayAvatar} alt="Avatar organisateur" className="h-full w-full object-cover" />
                  ) : (
                    <span>{initials(profile?.name ?? name)}</span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{profile?.name || name || "Nom du compte"}</p>
                  <p className="text-xs text-slate-500">{profile?.email}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Photo de profil / URL</label>
                <div className="flex flex-col gap-3 md:flex-row">
                  <Input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." className="flex-1" />
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5">
                    <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) void handleAvatarUpload(file); e.currentTarget.value = ""; }} />
                    {uploadingAvatar ? "Upload..." : "Importer"}
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nom complet</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Plamedi Bokanga" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Telephone</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+243 ..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Entreprise / organisation</label>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="EVENTIA" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Titre / role</label>
                <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Organisateur principal" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Biographie</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100" placeholder="Une presentation courte et professionnelle." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Adresse ligne 1</label>
                <Input value={addressLine1} onChange={e => setAddressLine1(e.target.value)} placeholder="Ngaliema, Route de Matadi" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Adresse ligne 2</label>
                <Input value={addressLine2} onChange={e => setAddressLine2(e.target.value)} placeholder="Repere local" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Ville</label>
                <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Kinshasa" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Code postal</label>
                <Input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="001" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Pays</label>
                <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="RDC" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Site web</label>
                <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Date de naissance</label>
                <Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">Vos informations sont utilisees pour personnaliser les invitations et les espaces de l'organisateur.</p>
              <Button type="submit" className="rounded-2xl px-5 py-3 text-sm" disabled={saving || loading}>
                {saving ? "Enregistrement..." : "Enregistrer le profil"}
              </Button>
            </div>
          </form>

          <aside className="space-y-4">
            <section className="rounded-[32px] border border-white/70 bg-slate-950 p-5 text-white shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/60">Resume rapide</p>
              <h2 className="mt-2 text-2xl font-semibold">Image de marque</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">Le profil sert de base a vos invitations, votre signature, vos notifications et votre presentation publique.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-white/10 bg-white/8 px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/50">Role</p>
                  <p className="mt-1 text-lg font-semibold">{profile?.jobTitle || jobTitle || "Organisateur"}</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/8 px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/50">Email</p>
                  <p className="mt-1 text-lg font-semibold break-all">{profile?.email}</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/8 px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/50">Invitation code</p>
                  <p className="mt-1 text-lg font-semibold break-all">{profile?.referralCode || "Non active"}</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/8 px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/50">Lieu</p>
                  <p className="mt-1 text-lg font-semibold">{city || "Kinshasa"}</p>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Statistiques</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {summaryCards.map(card => (
                  <div key={card.label} className="rounded-[20px] border border-slate-200/80 bg-slate-50 px-4 py-4">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{card.label}</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{card.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-[22px] border border-slate-200/80 bg-white px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">Types d'evenements</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  {topTypes.length === 0 ? (
                    <p>Aucune statistique disponible pour le moment.</p>
                  ) : (
                    topTypes.map(([type, value]) => (
                      <div key={type} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                        <span>{type}</span>
                        <span className="font-semibold text-slate-900">{value}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}


