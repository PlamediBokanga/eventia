"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { hasActiveSession, storeSessionToken } from "@/lib/auth";
import { API_URL } from "@/lib/config";
import { AuthDivider, AuthPopup, AuthShell, GoogleButton } from "@/components/auth/AuthShell";

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
    subtitle: "Mariage, anniversaire et événements privés",
    hint: "Un espace complet pour organiser vos propres événements et gérer vos invitations."
  },
  {
    value: "agency",
    title: "Agence événementielle",
    subtitle: "Plusieurs clients et plusieurs événements",
    hint: "Pour coordonner vos clients, vos équipes et les événements de votre agence."
  },
  {
    value: "company",
    title: "Entreprise",
    subtitle: "Conférence, séminaire et événements internes",
    hint: "Un espace adapté aux événements professionnels et aux besoins de votre organisation."
  }
];

function getAccountTypeMeta(type: AccountType) {
  return ACCOUNT_TYPES.find(item => item.value === type) ?? ACCOUNT_TYPES[0];
}

export function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accountType, setAccountType] = useState<AccountType>(() => {
    const requestedType = searchParams.get("type");
    return ACCOUNT_TYPES.some(item => item.value === requestedType) ? (requestedType as AccountType) : "organizer";
  });
  const [step, setStep] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
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
  const [acceptTerms, setAcceptTerms] = useState(false);
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMessage("Saisissez une adresse e-mail valide.");
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
      title="Créez votre espace EVENTIA."
      description="Un parcours guidé pour configurer votre compte et commencer à organiser vos événements."
      sideTitle="Une organisation plus simple, dès le départ."
      sideCopy="Choisissez votre profil, renseignez vos coordonnées et sécurisez votre accès. Votre espace sera adapté à votre façon d’organiser."
      sideStats={[
        { value: "3 étapes", label: "Un parcours guidé" },
        { value: "Sécurisé", label: "Un accès personnel" }
      ]}
      footer={
        <>
          Vous avez déjà un compte ?{" "}
          <Link href="/auth/login" className="font-semibold text-primary hover:text-accent">
            Se connecter
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {step === 1 && (
          <>
            {googleEnabled && (
              <>
                <GoogleButton href={googleHref} label="Continuer avec Google" />
                <AuthDivider label="ou avec votre adresse e-mail" />
              </>
            )}

        <section aria-labelledby="account-type-heading" className="space-y-3">
          <div>
            <h3 id="account-type-heading" className="text-base font-semibold text-slate-950">Choisissez votre profil</h3>
            <p className="mt-1 text-sm leading-5 text-slate-500">Sélectionnez l’espace adapté à votre activité.</p>
          </div>
          <div role="group" aria-label="Type de compte" className="grid gap-3 md:grid-cols-3">
            {ACCOUNT_TYPES.map(item => {
              const active = item.value === accountType;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setAccountType(item.value)}
                  className={`rounded-[20px] border p-4 text-left transition ${
                    active
                      ? "border-slate-900 bg-slate-50 text-slate-950 ring-1 ring-slate-900"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
                  }`}
                >
                  <h4 className="text-sm font-semibold">{item.title}</h4>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{item.subtitle}</p>
                </button>
              );
            })}
          </div>
          <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{accountMeta.title}:</span> {accountMeta.hint}
          </div>
        </section>
        <button type="button" onClick={() => setStep(2)} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200">
          Continuer
        </button>
          </>
        )}

        <ol aria-label="Progression de l’inscription" className="grid grid-cols-3 gap-2">
          {["Profil", "Informations", "Sécurité"].map((label, index) => {
            const itemStep = index + 1;
            const active = step === itemStep;
            const complete = step > itemStep;
            return (
              <li key={label} aria-current={active ? "step" : undefined}>
                <div className={`h-1 rounded-full ${active || complete ? "bg-slate-900" : "bg-slate-200"}`} />
                <p className={`mt-2 text-[11px] font-medium sm:text-xs ${active ? "text-slate-950" : "text-slate-500"}`}>
                  <span className="mr-1.5">{complete ? "✓" : `0${itemStep}`}</span>{label}
                </p>
              </li>
            );
          })}
        </ol>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" noValidate>
          {step === 2 && (
            <section aria-labelledby="account-info-heading" className="space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 id="account-info-heading" className="text-base font-semibold text-slate-950">Informations de votre structure</h3>
            <p className="mt-1 text-sm leading-5 text-slate-500">Les champs marqués sont nécessaires pour créer votre espace.</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="register-company" className="block text-sm font-medium text-slate-800">Nom de l'organisation ou marque <span className="text-rose-700">*</span></label>
            <input
              id="register-company"
              autoComplete="organization"
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder={accountType === "company" ? "EVENTIA Corporate" : accountType === "agency" ? "EVENTIA Agency" : "EVENTIA Events"}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="register-name" className="block text-sm font-medium text-slate-800">Nom complet <span className="text-rose-700">*</span></label>
              <input
                id="register-name"
                autoComplete="name"
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Plamedi Bokanga"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="register-phone" className="block text-sm font-medium text-slate-800">Téléphone <span className="text-rose-700">*</span></label>
              <input
                id="register-phone"
                type="tel"
                autoComplete="tel"
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+243 900 000 000"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="register-job" className="block text-sm font-medium text-slate-800">Fonction / poste <span className="text-slate-400">(facultatif)</span></label>
              <input
                id="register-job"
                autoComplete="organization-title"
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder={accountType === "company" ? "Direction evenementielle" : accountType === "agency" ? "Chef de projet" : "Fondateur, Event Manager..."}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="register-country" className="block text-sm font-medium text-slate-800">Pays <span className="text-rose-700">*</span></label>
              <input
                id="register-country"
                autoComplete="country-name"
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="RDC"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="register-city" className="block text-sm font-medium text-slate-800">Ville <span className="text-slate-400">(facultatif)</span></label>
              <input
                id="register-city"
                autoComplete="address-level2"
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Kinshasa"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="register-website" className="block text-sm font-medium text-slate-800">Site web <span className="text-slate-400">(facultatif)</span></label>
              <input
                id="register-website"
                type="url"
                autoComplete="url"
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="https://votre-site.com"
              />
            </div>
          </div>

          <div className="flex gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setStep(1)} className="min-h-12 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100">Retour</button>
            <button type="button" onClick={() => { if (formRef.current?.reportValidity()) setStep(3); }} className="min-h-12 flex-1 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200">Continuer</button>
          </div>
            </section>
          )}

          {step === 3 && (
            <section aria-labelledby="account-security-heading" className="space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 id="account-security-heading" className="text-base font-semibold text-slate-950">Créer vos identifiants</h3>
            <p className="mt-1 text-sm leading-5 text-slate-500">Ils vous permettront de vous connecter et de protéger votre espace.</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="register-email" className="block text-sm font-medium text-slate-800">Adresse e-mail <span className="text-rose-700">*</span></label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@eventia.app"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="register-referral" className="block text-sm font-medium text-slate-800">Code partenaire <span className="text-slate-400">(facultatif)</span></label>
            <input
              id="register-referral"
              autoComplete="off"
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm uppercase text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
              value={referralCode}
              onChange={e => setReferralCode(e.target.value.toUpperCase())}
              placeholder="Optionnel"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="register-password" className="block text-sm font-medium text-slate-800">Mot de passe <span className="text-rose-700">*</span></label>
                <span className="text-xs text-slate-500">Obligatoire</span>
              </div>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  aria-describedby="password-requirements"
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-20 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Au moins 6 caracteres, avec majuscule, minuscule, chiffre et symbole"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  {showPassword ? "Masquer" : "Afficher"}
                </button>
              </div>
              <div id="password-requirements" aria-live="polite" className="grid gap-x-3 gap-y-1.5 pt-1 text-[11px] sm:grid-cols-2">
                <span className={passwordChecks.length ? "text-emerald-700" : "text-slate-500"}>{passwordChecks.length ? "✓" : "○"} 6 caractères minimum</span>
                <span className={passwordChecks.upper ? "text-emerald-700" : "text-slate-500"}>{passwordChecks.upper ? "✓" : "○"} Une majuscule</span>
                <span className={passwordChecks.lower ? "text-emerald-700" : "text-slate-500"}>{passwordChecks.lower ? "✓" : "○"} Une minuscule</span>
                <span className={passwordChecks.digit ? "text-emerald-700" : "text-slate-500"}>{passwordChecks.digit ? "✓" : "○"} Un chiffre</span>
                <span className={passwordChecks.special ? "text-emerald-700 sm:col-span-2" : "text-slate-500 sm:col-span-2"}>
                  {passwordChecks.special ? "✓" : "○"} Un caractère spécial
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="register-confirm-password" className="block text-sm font-medium text-slate-800">Confirmer le mot de passe <span className="text-rose-700">*</span></label>
              <input
                id="register-confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Retapez le mot de passe"
                required
              />
              {confirmPassword && password !== confirmPassword && (
                <p role="status" className="text-xs font-medium text-rose-700">Les mots de passe ne correspondent pas.</p>
              )}
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-primary/20"
              checked={acceptTerms}
              required
              aria-label="Accepter les conditions d’utilisation et la politique de confidentialité"
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

          <div className="flex gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setStep(2)} className="min-h-12 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100">Retour</button>
            <button className="flex min-h-12 flex-[1.5] items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70" type="submit" disabled={loading}>
              {loading ? "Creation securisee..." : `Creer mon espace ${accountMeta.title.toLowerCase()}`}
            </button>
          </div>
            </section>
          )}
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

