"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { hasActiveSession, storeSessionToken } from "@/lib/auth";
import { API_URL } from "@/lib/config";
import { AuthDivider, AuthPopup, AuthShell, FacebookButton, GoogleButton } from "@/components/auth/AuthShell";

type ProvidersResponse = {
  google?: {
    enabled?: boolean;
  };
  facebook?: {
    enabled?: boolean;
  };
};

type LoginResponse = {
  message?: string;
  code?: string;
  verificationRequired?: boolean;
  verificationUrl?: string;
  token?: string;
};

function resolveLoginError(errorCode: string | null) {
  switch (errorCode) {
    case "google_not_configured":
      return "La connexion Google n'est pas encore configuree sur ce serveur.";
    case "google_code_missing":
      return "Connexion Google interrompue. Reessayez.";
    case "google_email_unverified":
      return "Votre adresse Google doit etre verifiee pour continuer.";
    case "google_login_failed":
      return "Impossible de terminer la connexion Google pour le moment.";
    case "facebook_not_configured":
      return "La connexion Facebook n''est pas encore configuree sur ce serveur.";
    case "facebook_code_missing":
      return "Connexion Facebook interrompue. Reessayez.";
    case "facebook_email_missing":
      return "Votre compte Facebook doit exposer une adresse email.";
    case "facebook_login_failed":
      return "Impossible de terminer la connexion Facebook pour le moment.";
    default:
      return null;
  }
}

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(resolveLoginError(searchParams.get("error")));
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [facebookEnabled, setFacebookEnabled] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);

  const googleHref = useMemo(() => `${API_URL}/auth/google?mode=login`, []);
  const facebookHref = useMemo(() => `${API_URL}/auth/facebook?mode=login`, []);

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
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      const data = (await res.json().catch(() => null)) as LoginResponse | null;

      if (!res.ok) {
        setMessage(data?.message || "Connexion impossible pour le moment.");
        if (data?.code === "EMAIL_NOT_VERIFIED" || data?.verificationRequired) {
          setVerificationEmail(email.trim());
          setVerificationUrl(data?.verificationUrl || null);
        } else {
          setVerificationEmail("");
          setVerificationUrl(null);
        }
        return;
      }

      if (data?.token) {
        storeSessionToken(data.token);
      }
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setMessage("Impossible de joindre le serveur. Verifiez la connexion et reessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Connexion"
      title="Votre espace, en toute simplicité."
      description="Connectez-vous pour retrouver vos événements, vos invités et vos outils de gestion."
      sideTitle="Chaque grand événement commence par une bonne organisation."
      sideCopy="Préparez vos invitations, coordonnez vos équipes et suivez le jour J depuis un espace unique, pensé pour les organisateurs."
      sideStats={[
        { value: "Invités", label: "Suivi centralisé" },
        { value: "Jour J", label: "Outils coordonnés" }
      ]}
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/auth/register" className="font-semibold text-[#43584b] underline-offset-4 hover:underline">
            Creer mon espace
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {googleEnabled || facebookEnabled ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {googleEnabled ? <GoogleButton href={googleHref} label="Continuer avec Google" /> : null}
              {facebookEnabled ? <FacebookButton href={facebookHref} label="Continuer avec Facebook" /> : null}
            </div>
            <AuthDivider label="ou par e-mail" />
          </>
        ) : (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Connectez-vous avec votre adresse e-mail.</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="login-email" className="block text-sm font-medium text-slate-800">Adresse e-mail</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#526b5c] focus:ring-4 focus:ring-[#edf2ee]"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@eventia.app"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-800">Mot de passe</label>
              <Link href="/auth/forgot-password" className="text-xs font-medium text-[#43584b] underline-offset-4 hover:underline">Mot de passe oublié ?</Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-20 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#526b5c] focus:ring-4 focus:ring-[#edf2ee]"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                onClick={() => setShowPassword(value => !value)}
                className="site-button-quiet absolute right-2 top-1/2 min-h-10 -translate-y-1/2 rounded-lg px-2 py-1 text-xs"
              >
                {showPassword ? "Masquer" : "Afficher"}
              </button>
            </div>
          </div>

          <button className="site-button-primary w-full active:scale-[0.99]" type="submit" disabled={loading}>
            {loading ? "Connexion en cours…" : "Se connecter"}
          </button>
        </form>

        <AuthPopup
          open={Boolean(message)}
          variant={verificationEmail ? "warning" : "error"}
          title={verificationEmail ? "Verification requise" : "Connexion refusee"}
          message={
            verificationEmail
              ? "Votre compte est cree, mais l'adresse email doit etre confirmee avant la connexion."
              : message || "Une erreur est survenue."
          }
          primaryLabel={verificationEmail ? "Ouvrir la verification" : "Fermer"}
          primaryHref={verificationEmail ? `/auth/verify-email?email=${encodeURIComponent(verificationEmail)}` : undefined}
          onPrimaryClick={verificationEmail ? undefined : () => setMessage(null)}
          secondaryLabel={verificationEmail ? "Ouvrir le lien direct" : undefined}
          secondaryHref={verificationUrl || undefined}
          onClose={() => {
            setMessage(null);
            setVerificationEmail("");
            setVerificationUrl(null);
          }}
        />
      </div>
    </AuthShell>
  );
}




