"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/config";
import { AuthActionBox, AuthNotice, AuthShell } from "@/components/auth/AuthShell";

function passwordStrength(password: string) {
  return {
    length: password.trim().length >= 6,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    digit: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };
}

export function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"info" | "success" | "warning" | "error">("info");

  const strength = passwordStrength(password);
  const strong = Object.values(strength).every(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setStatus("info");

    if (!token) {
      setMessage("Token de reinitialisation manquant.");
      setStatus("error");
      return;
    }
    if (!strong) {
      setMessage("Le nouveau mot de passe doit contenir au moins 6 caracteres, une majuscule, une minuscule, un chiffre et un caractere special.");
      setStatus("warning");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("La confirmation ne correspond pas.");
      setStatus("warning");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/password/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token, password })
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        setMessage(data?.message || "Impossible de reinitialiser le mot de passe.");
        setStatus("error");
        return;
      }
      setMessage(data?.message || "Mot de passe mis a jour.");
      setStatus("success");
    } catch (err) {
      console.error(err);
      setMessage("Impossible de finaliser la reinitialisation.");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Acces securise"
      title="Choisissez un nouveau mot de passe."
      description="Votre nouveau mot de passe doit etre suffisamment fort pour proteger le dashboard organisateur."
      sideTitle="Reprenez l'accès avec un nouveau secret solide."
      sideCopy="Le token de reinitialisation est temporaire. Une fois le mot de passe change, l'ancien acces doit etre considere comme invalide."
      sideStats={[
        { value: "6+", label: "Caracteres minimum" },
        { value: "JWT", label: "Jeton temporaire et signé" },
        { value: "Secure", label: "Mise a jour propre du mot de passe" }
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-800">Nouveau mot de passe</label>
          <input
            type="password"
            autoComplete="new-password"
            className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Au moins 6 caracteres"
            required
          />
        </div>
        <div className="grid gap-2 text-[11px] text-slate-500 md:grid-cols-2">
          <span className={strength.length ? "text-emerald-700" : ""}>6+ caracteres</span>
          <span className={strength.upper ? "text-emerald-700" : ""}>1 majuscule</span>
          <span className={strength.lower ? "text-emerald-700" : ""}>1 minuscule</span>
          <span className={strength.digit ? "text-emerald-700" : ""}>1 chiffre</span>
          <span className={strength.special ? "text-emerald-700 md:col-span-2" : "md:col-span-2"}>
            1 caractere special
          </span>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-800">Confirmer le mot de passe</label>
          <input
            type="password"
            autoComplete="new-password"
            className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Retapez le nouveau mot de passe"
            required
          />
        </div>

        {message ? (
          status === "success" ? (
            <AuthActionBox
              variant="success"
              title="Mot de passe mis a jour"
              message={message}
              primaryLabel="Ouvrir la connexion"
              primaryHref="/auth/login"
              secondaryLabel="Retour a l'accueil"
              secondaryHref="/"
            />
          ) : (
            <AuthNotice variant={status} title="Etat de la reinitialisation" message={message} />
          )
        ) : null}

        <button className="btn-primary w-full justify-center py-3 text-sm" type="submit" disabled={loading}>
          {loading ? "Mise a jour..." : "Mettre a jour"}
        </button>
      </form>
    </AuthShell>
  );
}
