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

  const googleHref = useMemo(() => `${API_URL}/auth/google?mode=login`, []);

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
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      const data = (await res.json().catch(() => null)) as { message?: string; token?: string } | null;

      if (!res.ok) {
        setMessage(data?.message || "Connexion impossible pour le moment.");
        return;
      }

      if (!data?.token) {
        setMessage("Reponse serveur incomplete. Aucun token de session recu.");
        return;
      }

      saveToken(data.token);
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
      eyebrow="Connexion securisee"
      title="Accedez a votre espace organisateur."
      description="Retrouvez vos evenements, vos invitations, votre check-in QR et votre facturation dans une interface claire et fiable."
      sideTitle="Pilotez chaque evenement avec une connexion digne d'un vrai produit."
      sideCopy="EVENTIA centralise vos invites, vos paiements, vos co-organisateurs et vos operations du jour J dans un espace de travail concu pour une utilisation professionnelle."
      sideStats={[
        { value: "QR", label: "Check-in rapide et suivi des arrives" },
        { value: "Live", label: "Chat, livre d'or et activite invites" },
        { value: "360", label: "Profil, billing et tableaux de bord unifies" }
      ]}
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/auth/register" className="font-semibold text-primary hover:text-accent">
            Creer mon espace
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <GoogleButton
          href={googleHref}
          disabled={!googleEnabled}
          label={googleEnabled ? "Continuer avec Google" : "Connexion Google bientot disponible"}
        />

        <AuthDivider label="ou avec votre email" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text/80">Adresse email</label>
            <input
              type="email"
              autoComplete="email"
              className="w-full rounded-2xl border border-primary/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent/45 focus:ring-4 focus:ring-accent/10"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@eventia.app"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-text/80">Mot de passe</label>
              <span className="text-xs text-text/45">Protection anti-bruteforce active</span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="w-full rounded-2xl border border-primary/15 bg-white px-4 py-3 pr-16 text-sm outline-none transition focus:border-accent/45 focus:ring-4 focus:ring-accent/10"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(value => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs font-medium text-text/55 transition hover:bg-primary/5 hover:text-text"
              >
                {showPassword ? "Masquer" : "Afficher"}
              </button>
            </div>
          </div>

          {message ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {message}
            </div>
          ) : null}

          <button className="btn-primary w-full justify-center py-3 text-sm" type="submit" disabled={loading}>
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>

        <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          <p className="font-medium text-slate-900">Connexion professionnelle</p>
          <p className="mt-1 leading-6">
            Votre session donne acces au dashboard organisateur, aux statistiques, au check-in et aux operations de
            paiement.
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
