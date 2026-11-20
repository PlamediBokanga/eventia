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
  const [statsError, setStatsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState("");
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

  const formValues = { name, phone, avatarUrl, companyName, jobTitle, addressLine1, addressLine2, city, postalCode, country, website, bio, dateOfBirth };
  const formSnapshot = JSON.stringify(formValues);
  const isDirty = Boolean(savedSnapshot) && savedSnapshot !== formSnapshot;
  const displayAvatar = normalizePublicUrl(avatarUrl || profile?.avatarUrl);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [profileResult, statsResult] = await Promise.allSettled([
          authFetch("/auth/me"),
          authFetch("/auth/me/stats")
        ]);
        if (profileResult.status !== "fulfilled" || !profileResult.value.ok) throw new Error("profile_load_failed");
        const profilePayload = (await profileResult.value.json()) as { organizer: OrganizerProfile };
        if (active) {
          const payload = profilePayload;
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
          setSavedSnapshot(JSON.stringify({
            name: organizer.name ?? "", phone: organizer.phone ?? "", avatarUrl: organizer.avatarUrl ?? "",
            companyName: organizer.companyName ?? "", jobTitle: organizer.jobTitle ?? "", addressLine1: organizer.addressLine1 ?? "",
            addressLine2: organizer.addressLine2 ?? "", city: organizer.city ?? "", postalCode: organizer.postalCode ?? "",
            country: organizer.country ?? "", website: organizer.website ?? "", bio: organizer.bio ?? "",
            dateOfBirth: organizer.dateOfBirth ? organizer.dateOfBirth.slice(0, 10) : ""
          }));
        }
        if (statsResult.status === "fulfilled" && statsResult.value.ok && active) {
          try {
            const payload = (await statsResult.value.json()) as { stats: OrganizerStats };
            if (active) setStats(payload.stats);
          } catch {
            if (active) setStatsError(true);
          }
        } else if (active) {
          setStatsError(true);
        }
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
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
      setSavedSnapshot(formSnapshot);
      pushToast("Profil mis a jour avec succes.");
    } catch {
      pushToast("Serveur injoignable. Verifiez votre connexion puis reessayez.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      pushToast("Formats autorisés : JPG, PNG ou WEBP.", "error");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      pushToast("La photo doit faire 4 Mo maximum.", "error");
      return;
    }
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
      { label: "Événements", value: stats?.totalEvents ?? 0 },
      { label: "Invités", value: stats?.totalGuests ?? 0 },
      { label: "Confirmés", value: stats?.confirmed ?? 0 },
      { label: "En attente", value: stats?.pending ?? 0 }
    ],
    [stats]
  );

  const topTypes = useMemo(
    () => Object.entries(stats?.types ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 4),
    [stats]
  );

  return (
    <main className="space-y-6 pb-8 font-sans">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:gap-5">
        <Header title="Profil" description="Gérez votre identité, vos coordonnées et les informations de votre organisation." />

        <AccountSectionTabs active="profile" />

        {loadError ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
            <p className="text-sm font-medium text-rose-900">Impossible de charger votre profil. Actualisez la page pour réessayer.</p>
            <Button type="button" variant="ghost" className="min-h-11" onClick={() => window.location.reload()}>Réessayer</Button>
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Activite du compte">
          {summaryCards.map(card => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{loading ? "—" : statsError ? "Indisponible" : card.value}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <form onSubmit={handleSave} className="space-y-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Photo et identite</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Informations du profil</h2>
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
              <h3 className="text-sm font-semibold text-slate-900 md:col-span-2">Informations personnelles</h3>
              <div className="space-y-2 md:col-span-2">
                  <label htmlFor="profile-avatar-url" className="text-sm font-medium text-slate-700">Photo de profil</label>
                <div className="flex flex-col gap-3 md:flex-row">
                  <Input id="profile-avatar-url" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="Coller l’URL d’une image" className="min-h-11 flex-1" />
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5">
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploadingAvatar} onChange={e => { const file = e.target.files?.[0]; if (file) void handleAvatarUpload(file); e.currentTarget.value = ""; }} />
                    {uploadingAvatar ? "Import en cours…" : "Importer une photo"}
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="profile-name" className="text-sm font-medium text-slate-700">Nom complet</label>
                <Input id="profile-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom complet" />
              </div>
              <div className="space-y-2">
                <label htmlFor="profile-phone" className="text-sm font-medium text-slate-700">Téléphone</label>
                <Input id="profile-phone" autoComplete="tel" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+243 …" />
              </div>
              <div className="space-y-2">
                <label htmlFor="profile-company" className="text-sm font-medium text-slate-700">Entreprise ou organisation</label>
                <Input id="profile-company" autoComplete="organization" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Nom de l’organisation" />
              </div>
              <div className="space-y-2">
                <label htmlFor="profile-job" className="text-sm font-medium text-slate-700">Fonction</label>
                <Input id="profile-job" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Organisateur principal" />
              </div>
              <h3 className="border-t border-slate-200 pt-4 text-sm font-semibold text-slate-900 md:col-span-2">Présentation</h3>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Biographie</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100" placeholder="Une presentation courte et professionnelle." />
              </div>
              <h3 className="border-t border-slate-200 pt-4 text-sm font-semibold text-slate-900 md:col-span-2">Coordonnées professionnelles</h3>
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
              <p className="text-sm text-slate-500">{isDirty ? "Modifications non enregistrées." : "Vos informations sont à jour."}</p>
              <Button type="submit" className="min-h-11 rounded-xl px-5 py-3 text-sm" disabled={saving || loading || loadError || !profile || !isDirty}>
                {saving ? "Enregistrement…" : "Enregistrer le profil"}
              </Button>
            </div>
          </form>

          <aside className="space-y-4">
            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Compte organisateur</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Résumé du profil</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Ces informations complètent vos coordonnées et peuvent apparaître dans vos espaces événementiels.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium text-slate-500">Rôle</p>
                  <p className="mt-1 font-semibold text-slate-900">{profile?.jobTitle || jobTitle || "Organisateur"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium text-slate-500">E-mail</p>
                  <p className="mt-1 break-all font-semibold text-slate-900">{profile?.email || "Non renseigné"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium text-slate-500">Code partenaire</p>
                  <p className="mt-1 break-all font-semibold text-slate-900">{profile?.referralCode || "Non activé"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium text-slate-500">Ville</p>
                  <p className="mt-1 font-semibold text-slate-900">{city || "Non renseignée"}</p>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Activité</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">Types d’événements</h2>
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
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}


