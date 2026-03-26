"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { saveToken } from "@/lib/auth";

export default function OrganisateurRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password, name })
      });

      if (res.status === 409) {
        setMessage("Un compte existe deja avec cet email.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setMessage("Erreur lors de la creation du compte.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.token) {
        saveToken(data.token);
        router.push("/dashboard");
      } else {
        setMessage("Compte cree, mais pas de token retourne.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Impossible de creer le compte. Verifiez le backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full card p-6 md:p-8 space-y-5">
        <h1 className="title-3">Creer un compte organisateur</h1>
        <p className="text-body-muted">
          Ce compte vous permettra de gerer vos evenements, invites et statistiques.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-small mb-1">Nom</label>
            <input
              className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nom complet ou organisation"
            />
          </div>
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
            {loading ? "Creation en cours..." : "Creer le compte"}
          </button>
        </form>
      </div>
    </main>
  );
}
