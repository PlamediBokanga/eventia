"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveToken, getToken } from "@/lib/auth";
import { API_URL } from "@/lib/config";
import { AuthDivider, AuthShell, GoogleButton } from "@/components/auth/AuthShell";

type ProvidersResponse = {
  google?: {
    enabled?: boolean;
  };
};

export function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const googleHref = useMemo(() => `${API_URL}/auth/google?mode=register`, []);
  const passwordChecks = useMemo(
    () => ({
      length: password.trim().length >= 10,
      lower: /[a-z]/.test(password),
      upper: /[A-Z]/.test(password),
      digit: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    }),
    [password]
  );
  const passwordIsStrong = Object.values(passwordChecks).every(Boolean);

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    let ignore = false;
    async function loadProviders() {
      try {
        const res = await fetch(`${API_URL}/auth/providers`);
        if (!res.ok) return;
        const data = (await res.json()) as ProvidersResponse;
        if (!ignore) setGoogleEnabled(Boolean(data.google?.enabled));
      } catch {
        if (!ignore) setGoogleEnabled(false);
      }
    }
    loadProviders();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!acceptTerms) {
      setMessage("Vous devez accepter les conditions d'utilisation pour creer un compte.");
      return;
    }
    if (!name.trim()) {
      setMessage("Votre nom complet est requis.");
      return;
    }
    if (!phone.trim()) {
      setMessage("Votre numero de telephone est requis.");
      return;
    }
    if (!companyName.trim()) {
      setMessage("Le nom de votre organisation ou marque est requis.");
      return;
    }
    if (!country.trim()) {
      setMessage("Le pays est requis pour configurer correctement votre espace.");
      return;
    }
    if (!passwordIsStrong) {
      setMessage("Le mot de passe doit contenir au moins 10 caracteres, une majuscule, une minuscule, un chiffre et un caractere special.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("La confirmation du mot de passe ne correspond pas.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name.trim(),
          companyName: companyName.trim(),
          jobTitle: jobTitle.trim(),
          phone: phone.trim(),
          city: city.trim(),
          country: country.trim(),
          website: website.trim(),
          referralCode: referralCode.trim(),
          email: email.trim(),
          password
        })
      });

      const data = (await res.json().catch(() => null)) as { message?: string; token?: string } | null;

      if (!res.ok) {
        setMessage(data?.message || "Erreur lors de la creation du compte.");
        return;
      }

      if (!data?.token) {
        setMessage("Compte cree, mais la session n'a pas pu etre initialisee.");
        return;
      }

      saveToken(data.token);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setMessage("Impossible de joindre le serveur. Reessayez dans quelques instants.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Lancement de compte"
      title="Creez un compte organisateur."
      description="Une inscription claire, sobre et structuree pour les utilisateurs qui se connectent a un vrai produit, pas a une demo."
      sideTitle="Un onboarding plus serieux, plus lisible, plus aligné avec une plateforme premium."
      sideCopy="Nous gardons un parcours direct, mais le traitement visuel et les interactions doivent inspirer confiance des la premiere seconde."
      sideStats={[
        { value: "1", label: "Compte, dashboard et session actives en un seul flux" },
        { value: "Pro", label: "Messages d'erreur et validation plus propres" },
        { value: "SSO", label: "Base prete pour Google Sign-In et extensions futures" }
      ]}
      footer={
        <>
          Vous avez deja un compte ?{" "}
          <Link href="/auth/login" className="font-semibold text-primary hover:text-accent">
            Ouvrir ma session
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <GoogleButton
          href={googleHref}
          disabled={!googleEnabled}
          label={googleEnabled ? "S'inscrire avec Google" : "Inscription Google bientot disponible"}
        />

        <AuthDivider label="ou creez votre compte" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-800">Nom de l'organisation ou marque</label>
            <input
              className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="EVENTIA Events"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-800">Nom complet</label>
              <input
                className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Plamedi Bokanga"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-800">Telephone</label>
              <input
                className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+243 900 000 000"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-800">Fonction / poste</label>
              <input
                className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="Fondateur, Event Manager..."
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-800">Pays</label>
              <input
                className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="RDC"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-800">Ville</label>
              <input
                className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Kinshasa"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-800">Site web</label>
              <input
                type="url"
                className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="https://votre-site.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-800">Adresse email</label>
            <input
              type="email"
              autoComplete="email"
              className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@eventia.app"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-800">Code partenaire ou referral</label>
            <input
              className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm uppercase outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              value={referralCode}
              onChange={e => setReferralCode(e.target.value.toUpperCase())}
              placeholder="Optionnel"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-slate-800">Mot de passe</label>
                <span className="text-xs text-slate-500">Fort requis</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 pr-16 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Au moins 10 caracteres"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                  {showPassword ? "Masquer" : "Afficher"}
                </button>
              </div>
              <div className="grid gap-2 pt-1 text-[11px] text-slate-500 md:grid-cols-2">
                <span className={passwordChecks.length ? "text-emerald-700" : ""}>10+ caracteres</span>
                <span className={passwordChecks.upper ? "text-emerald-700" : ""}>1 majuscule</span>
                <span className={passwordChecks.lower ? "text-emerald-700" : ""}>1 minuscule</span>
                <span className={passwordChecks.digit ? "text-emerald-700" : ""}>1 chiffre</span>
                <span className={passwordChecks.special ? "text-emerald-700 md:col-span-2" : "md:col-span-2"}>
                  1 caractere special
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-800">Confirmer</label>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Retapez le mot de passe"
                required
              />
            </div>
          </div>
          <label className="flex items-start gap-3 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-primary/20"
              checked={acceptTerms}
              onChange={e => setAcceptTerms(e.target.checked)}
            />
            <span>
              J'accepte les{" "}
              <Link href="/terms" className="font-medium text-primary hover:text-accent">
                conditions d'utilisation
              </Link>{" "}
              et la{" "}
              <Link href="/privacy" className="font-medium text-primary hover:text-accent">
                politique de confidentialite
              </Link>
              .
            </span>
          </label>
          {message ? (
            <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {message}
            </div>
          ) : null}
          <button className="btn-primary w-full justify-center py-3 text-sm" type="submit" disabled={loading}>
            {loading ? "Creation du compte..." : "Creer mon espace"}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
