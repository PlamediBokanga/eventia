"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { saveToken } from "@/lib/auth";

export default function OrganisateurLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        setMessage("Identifiants invalides ou erreur serveur.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.token) {
        saveToken(data.token);
        router.push("/dashboard");
      } else {
        setMessage("Reponse inattendue du serveur.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Impossible de se connecter. Verifiez le backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full card p-6 md:p-8 space-y-5">
        <h1 className="title-3">Connexion organisateur</h1>
        <p className="text-body-muted">
          Utilisez l'email et le mot de passe configures via l'API
          <code className="ml-1 text-[10px] bg-background/80 px-1 rounded">POST /auth/register</code>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-small mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-small mb-1">Mot de passe</label>
            <input
              type="password"
              className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {message && <p className="text-small bg-background/80 rounded-xl px-3 py-2">{message}</p>}

          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </main>
  );
}
