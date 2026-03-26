"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { authFetch, type OrganizerProfile } from "@/lib/dashboard";

export default function DashboardSettingsPage() {
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const { pushToast } = useToast();

  useEffect(() => {
    async function load() {
      const res = await authFetch("/auth/me");
      if (!res.ok) return;
      const data = (await res.json()) as { organizer: OrganizerProfile };
      setProfile(data.organizer);
      setName(data.organizer.name ?? "");
      setPhone(data.organizer.phone ?? "");
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
  }, []);

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
          password: password || undefined
        })
      });
      if (!res.ok) {
        pushToast("Mise a jour impossible.", "error");
        return;
      }
      const data = (await res.json()) as { organizer: OrganizerProfile };
      setProfile(data.organizer);
      setPassword("");
      pushToast("Parametres mis a jour.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-4">
      <Header title="Parametres Organisateur" />
      <section className="card p-4 max-w-2xl">
        {!profile ? (
          <p className="text-small">Chargement du profil...</p>
        ) : (
          <form onSubmit={save} className="grid gap-3 text-xs">
            <p className="text-small">Email: {profile.email}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                placeholder="Nom complet"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <Input
                placeholder="Telephone"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                placeholder="Entreprise"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
              <Input
                placeholder="Fonction / Poste"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
              />
            </div>
            <Input
              placeholder="Adresse (ligne 1)"
              value={addressLine1}
              onChange={e => setAddressLine1(e.target.value)}
            />
            <Input
              placeholder="Adresse (ligne 2)"
              value={addressLine2}
              onChange={e => setAddressLine2(e.target.value)}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input
                placeholder="Ville"
                value={city}
                onChange={e => setCity(e.target.value)}
              />
              <Input
                placeholder="Code postal"
                value={postalCode}
                onChange={e => setPostalCode(e.target.value)}
              />
              <Input
                placeholder="Pays"
                value={country}
                onChange={e => setCountry(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                placeholder="Site web (https://...)"
                value={website}
                onChange={e => setWebsite(e.target.value)}
              />
              <Input
                type="date"
                placeholder="Date de naissance"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
              />
            </div>
            <textarea
              className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
              rows={4}
              placeholder="Bio / Informations complementaires"
              value={bio}
              onChange={e => setBio(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Nouveau mot de passe (optionnel)"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <Button className="w-full sm:w-fit" disabled={saving}>
              {saving ? "Sauvegarde..." : "Enregistrer"}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
