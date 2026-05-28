"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/config";
import { AuthNotice, AuthShell } from "@/components/auth/AuthShell";

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
          headers: {
            "Content-Type": "application/json"
          },
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
        headers: {
          "Content-Type": "application/json"
        },
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
      <div className="space-y-4">
        {token ? (
          <AuthNotice
            variant={verified ? "success" : "info"}
            title={verified ? "Adresse verifiee" : "Verification en cours"}
            message={message || "Traitement en cours..."}
          />
        ) : (
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

            {message ? <AuthNotice variant="info" message={message} /> : null}

            {verificationUrl ? (
              <AuthNotice
                variant="success"
                title="Lien de verification disponible"
                message={
                  <a href={verificationUrl} className="break-all font-medium text-emerald-700 underline">
                    {verificationUrl}
                  </a>
                }
              />
            ) : null}

            <button className="btn-primary w-full justify-center py-3 text-sm" type="submit" disabled={loading}>
              {loading ? "Preparation..." : "Envoyer le lien"}
            </button>
          </form>
        )}

        {token ? (
          <AuthNotice
            variant="info"
            title="Et ensuite ?"
            message="Une fois l'email confirme, vous pouvez ouvrir la connexion et acceder au dashboard."
            action={
              <Link href="/auth/login" className="font-medium text-slate-900 underline">
                Aller a la connexion
              </Link>
            }
          />
        ) : null}
      </div>
    </AuthShell>
  );
}
