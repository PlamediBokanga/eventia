"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/config";
import { AuthNotice, AuthPopup, AuthShell } from "@/components/auth/AuthShell";

type VerificationResponse = {
  message?: string;
  verificationUrl?: string;
};

export function EmailVerificationClient() {
  const searchParams = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(Boolean(token));
  const [message, setMessage] = useState<string | null>(token ? "Verification en cours..." : null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    let cancelled = false;

    async function verifyToken(currentToken: string) {
      setLoading(true);
      setMessage("Verification en cours...");
      try {
        const res = await fetch(`${API_URL}/auth/email/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: currentToken })
        });

        const data = (await res.json().catch(() => null)) as VerificationResponse | null;
        if (cancelled) return;

        if (!res.ok) {
          setVerified(false);
          setMessage(data?.message || "Impossible de verifier l'adresse email.");
          return;
        }

        setVerified(true);
        setMessage(data?.message || "Adresse email verifiee avec succes.");
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setVerified(false);
          setMessage("Impossible de joindre le serveur pour verifier l'adresse email.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (token) {
      verifyToken(token);
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setVerificationUrl(null);
    setVerified(false);

    try {
      const res = await fetch(`${API_URL}/auth/email/verification/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = (await res.json().catch(() => null)) as VerificationResponse | null;
      setMessage(data?.message || "Si un compte existe, un lien de verification a ete prepare.");
      setVerificationUrl(data?.verificationUrl || null);
    } catch (err) {
      console.error(err);
      setMessage("Impossible de preparer la verification pour le moment.");
    } finally {
      setLoading(false);
    }
  }

  const statusTone = token ? (verified ? "success" : "info") : verificationUrl ? "success" : "info";

  return (
    <AuthShell
      eyebrow="Verification du compte"
      title="Confirmez votre adresse email."
      description="La verification email renforce la confiance et securise l'acces des organisateurs."
      sideTitle="Un compte actif commence par une adresse valide."
      sideCopy="Cette etape permet de valider la provenance du compte et de preparer les flux de securite comme la reinitialisation et les notifications."
      sideStats={[
        { value: "24h", label: "Validite des jetons de verification" },
        { value: "Secure", label: "Confirmation du titulaire de la boite email" },
        { value: "Prod", label: "Parcours compatible production et staging" }
      ]}
      footer={
        <>
          Retour a la{" "}
          <Link href="/auth/login" className="font-semibold text-primary hover:text-accent">
            connexion
          </Link>
          .
        </>
      }
    >
      <div className="space-y-5">
        <AuthNotice
          variant={statusTone}
          title={token ? (verified ? "Adresse verifiee" : loading ? "Verification en cours" : "Verification du token") : "Verification du compte"}
          message={
            <div className="space-y-2">
              <p className="leading-6 text-slate-700">
                {token
                  ? verified
                    ? "Votre adresse email est maintenant valide. Vous pouvez ouvrir votre session ou revenir au tableau de bord."
                    : "Le lien de verification est traite automatiquement. Si la verification n'est pas encore terminee, patientez un instant."
                  : "Entrez l'adresse email du compte pour recevoir ou regenerer un lien de verification propre et temporaire."}
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">Jeton temporaire</div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">Lien protege</div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">Flux coherent</div>
              </div>
            </div>
          }
        />

        {!token ? (
          <form onSubmit={handleRequest} className="space-y-4">
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

            <button className="btn-primary w-full justify-center py-3 text-sm shadow-[0_16px_30px_rgba(15,23,42,0.18)] transition-transform active:scale-[0.99]" type="submit" disabled={loading}>
              {loading ? "Preparation..." : "Envoyer le lien"}
            </button>
          </form>
        ) : null}

        <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
          <p className="font-medium text-slate-900">Astuce</p>
          <p className="mt-1 leading-6">
            Si le lien n'arrive pas, verifiez aussi le dossier spam et demandez un renvoi depuis cette page.
          </p>
        </div>

        <AuthPopup
          open={Boolean(message)}
          variant={token ? (verified ? "success" : "info") : verificationUrl ? "success" : "info"}
          title={
            token
              ? verified
                ? "Adresse verifiee"
                : "Verification en cours"
              : verificationUrl
                ? "Lien de verification disponible"
                : "Verification du compte"
          }
          message={
            token
              ? message || "Traitement en cours..."
              : verificationUrl
                ? "Ouvrez le lien pour confirmer votre email."
                : message || "Votre demande a ete prise en compte."
          }
          primaryLabel={token ? (verified ? "Ouvrir la connexion" : "Fermer") : verificationUrl ? "Ouvrir le lien" : "Fermer"}
          primaryHref={token ? "/auth/login" : verificationUrl || undefined}
          onPrimaryClick={token || verificationUrl ? undefined : () => setMessage(null)}
          secondaryLabel={token ? "Actualiser" : verificationUrl ? "Retour au login" : undefined}
          secondaryHref={token ? undefined : verificationUrl ? "/auth/login" : undefined}
          onSecondaryClick={token ? () => window.location.reload() : undefined}
          onClose={() => {
            setMessage(null);
            setVerificationUrl(null);
          }}
        />
      </div>
    </AuthShell>
  );
}