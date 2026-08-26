"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { hasActiveSession, storeSessionToken } from "@/lib/auth";
import { API_URL } from "@/lib/config";
import { AuthDivider, AuthNotice, AuthPopup, AuthShell, FacebookButton, GoogleButton } from "@/components/auth/AuthShell";

type ProvidersResponse = {
  google?: {
    enabled?: boolean;
  };
  facebook?: {
    enabled?: boolean;
  };
};

type AccountType = "organizer" | "agency" | "company";

const ACCOUNT_TYPES: Array<{
  value: AccountType;
  title: string;
  subtitle: string;
  hint: string;
}> = [
  {
    value: "organizer",
    title: "Organisateur particulier",
    subtitle: "Mariage, anniversaire, fete privee",
    hint: "Idem pour un compte seul, avec dashboard complet et invitation privee."
  },
  {
    value: "agency",
    title: "Agence evenementielle",
    subtitle: "Plusieurs clients et plusieurs evenements",
    hint: "Pour gerer des equipes, des clients, des co-organisateurs et des droits."
  },
  {
    value: "company",
    title: "Entreprise / corporate",
    subtitle: "Conference, seminaire, interne",
    hint: "Pour les structures qui veulent un cadre plus corporate et multi-usage."
  }
];

function getAccountTypeMeta(type: AccountType) {
  return ACCOUNT_TYPES.find(item => item.value === type) ?? ACCOUNT_TYPES[0];
}

export function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accountType, setAccountType] = useState<AccountType>((searchParams.get("type") as AccountType) || "organizer");
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
  const [facebookEnabled, setFacebookEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);

  const googleHref = useMemo(() => `${API_URL}/auth/google?mode=register`, []);
  const facebookHref = useMemo(() => `${API_URL}/auth/facebook?mode=register`, []);
  const passwordChecks = useMemo(
    () => ({
      length: password.trim().length >= 6,
      lower: /[a-z]/.test(password),
      upper: /[A-Z]/.test(password),
      digit: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    }),
    [password]
  );
  const passwordIsStrong = Object.values(passwordChecks).every(Boolean);
  const accountMeta = getAccountTypeMeta(accountType);

  useEffect(() => {
    let alive = true;

    async function checkSession() {
      if (await hasActiveSession()) {
        if (alive) router.replace("/dashboard");
      }
    }

    void checkSession();
    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    let ignore = false;
    async function loadProviders() {
      try {
        const res = await fetch(`${API_URL}/auth/providers`, { credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as ProvidersResponse;
        if (!ignore) {
          setGoogleEnabled(Boolean(data.google?.enabled));
          setFacebookEnabled(Boolean(data.facebook?.enabled));
        }
      } catch {
        if (!ignore) {
          setGoogleEnabled(false);
          setFacebookEnabled(false);
        }
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
    setVerificationUrl(null);

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
      setMessage("Le nom de votre organisation est requis.");
      return;
    }
    if (!country.trim()) {
      setMessage("Le pays est requis pour configurer correctement votre espace.");
      return;
    }
    if (!passwordIsStrong) {
      setMessage("Le mot de passe doit contenir au moins 6 caracteres, une majuscule, une minuscule, un chiffre et un caractere special.");
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
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          accountType,
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

      const data = (await res.json().catch(() => null)) as {
        message?: string;
        verificationRequired?: boolean;
        verificationUrl?: string;
        token?: string;
      } | null;

      if (!res.ok) {
        setMessage(data?.message || "Erreur lors de la creation du compte.");
        return;
      }

      if (data?.verificationRequired) {
        setMessage(data?.message || "Compte cree. Verifiez votre email pour activer l'acces.");
        setVerificationUrl(data?.verificationUrl || null);
        return;
      }

      if (data?.token) {
        storeSessionToken(data.token);
      }
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
      title="Creez un compte adaptee a votre structure."
      description="Une inscription serieuse, segmentee par profil, pour que chaque compte Eventia parte avec la bonne logique metier des le debut."
      sideTitle="Un onboarding plus clair pour les organisateurs, agences et entreprises."
      sideCopy="Le meme produit, mais avec des entrees differentes selon le contexte d'utilisation: evenement prive, agence multi-client ou corporate."
      sideStats={[
        { value: "3", label: "Profils de compte clairs des l'inscription" },
        { value: "SSO", label: "Google compatible et flux sÃ©curisÃ©" },
        { value: "6+", label: "Mot de passe fort oblige" }
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
        <AuthNotice
          variant={passwordIsStrong ? "success" : "info"}
          title="Creation de compte"
          message={
            <div className="space-y-2">
              <p className="leading-6">
                Choisissez d'abord votre type de compte. Le parcours et les recommandations s'adaptent ensuite a votre usage reel.
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">Profil pro</div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">Google SSO</div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">Facebook SSO</div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">Mot de passe fort</div>
              </div>
            </div>
          }
        />

        <GoogleButton
          href={googleHref}
          disabled={!googleEnabled}
          label={googleEnabled ? "S'inscrire avec Google" : "Inscription Google bientot disponible"}
        />

        <AuthDivider label="ou creez votre compte" />

        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Type de compte</p>
          <div className="grid gap-3 md:grid-cols-3">
            {ACCOUNT_TYPES.map(item => {
              const active = item.value === accountType;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setAccountType(item.value)}
                  className={`rounded-[20px] border p-4 text-left transition ${
                    active
                      ? "border-slate-900 bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
                      : "border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-slate-300"
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-[0.24em] opacity-70">{item.value}</p>
                  <h3 className="mt-2 text-sm font-semibold">{item.title}</h3>
                  <p className={`mt-2 text-xs leading-5 ${active ? "text-white/75" : "text-slate-500"}`}>{item.subtitle}</p>
                </button>
              );
            })}
          </div>
          <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{accountMeta.title}:</span> {accountMeta.hint}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-800">Nom de l'organisation ou marque</label>
            <input
              className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder={accountType === "company" ? "EVENTIA Corporate" : accountType === "agency" ? "EVENTIA Agency" : "EVENTIA Events"}
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
                placeholder={accountType === "company" ? "Direction evenementielle" : accountType === "agency" ? "Chef de projet" : "Fondateur, Event Manager..."}
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
                  placeholder="Au moins 6 caracteres, avec majuscule, minuscule, chiffre et symbole"
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
                <span className={passwordChecks.length ? "text-emerald-700" : ""}>6+ caracteres</span>
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

          <button className="btn-primary w-full justify-center py-3 text-sm shadow-[0_16px_30px_rgba(15,23,42,0.18)] transition-transform active:scale-[0.99]" type="submit" disabled={loading}>
            {loading ? "Creation securisee..." : `Creer mon espace ${accountMeta.title.toLowerCase()}`}
          </button>
        </form>

        <AuthPopup
          open={Boolean(message)}
          variant={verificationUrl ? "success" : "warning"}
          title={verificationUrl ? "Compte cree" : "Creation refusee"}
          message={
            verificationUrl
              ? "Ouvrez le lien pour confirmer votre adresse et finaliser l'activation du compte."
              : message || "Une erreur est survenue."
          }
          primaryLabel={verificationUrl ? "Ouvrir le lien de verification" : "Fermer"}
          primaryHref={verificationUrl || undefined}
          onPrimaryClick={verificationUrl ? undefined : () => setMessage(null)}
          secondaryLabel={verificationUrl ? "Page de verification" : undefined}
          secondaryHref={verificationUrl ? "/auth/verify-email" : undefined}
          onClose={() => {
            setMessage(null);
            setVerificationUrl(null);
          }}
        />
      </div>
    </AuthShell>
  );
}

