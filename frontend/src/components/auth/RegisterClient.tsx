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
  const [phone, setPhone] = useState("");
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
    if (password.length < 6) {
      setMessage("Le mot de passe doit contenir au moins 6 caracteres.");
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
          phone: phone.trim(),
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text/80">Nom complet</label>
              <input
                className="w-full rounded-2xl border border-primary/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent/45 focus:ring-4 focus:ring-accent/10"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Plamedi Bokanga"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text/80">Telephone</label>
              <input
                className="w-full rounded-2xl border border-primary/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent/45 focus:ring-4 focus:ring-accent/10"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+243 900 000 000"
              />
            </div>
          </div>
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
            <label className="block text-sm font-medium text-text/80">Code partenaire ou referral</label>
            <input
              className="w-full rounded-2xl border border-primary/15 bg-white px-4 py-3 text-sm uppercase outline-none transition focus:border-accent/45 focus:ring-4 focus:ring-accent/10"
              value={referralCode}
              onChange={e => setReferralCode(e.target.value.toUpperCase())}
              placeholder="Optionnel"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text/80">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-primary/15 bg-white px-4 py-3 pr-16 text-sm outline-none transition focus:border-accent/45 focus:ring-4 focus:ring-accent/10"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 caracteres"
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
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text/80">Confirmer</label>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="w-full rounded-2xl border border-primary/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent/45 focus:ring-4 focus:ring-accent/10"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Retapez le mot de passe"
                required
              />
            </div>
          </div>
          <label className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-primary/[0.03] px-4 py-3 text-sm text-text/70">
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
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
