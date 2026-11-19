"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { API_URL } from "@/lib/config";
import type { InvitationData } from "@/components/InvitationClient";
import { InviteSteps } from "@/components/layout/InviteSteps";
import { getInvitationAnimationClass, getInvitationThemeStyle } from "@/lib/invitationTheme";

export default function InviteDrinksPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<InvitationData | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_URL}/invitations/${token}`);
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { message?: string } | null;
          if (!cancelled) setMessage(payload?.message ?? `Invitation indisponible (HTTP ${res.status}).`);
          return;
        }
        const invitation = (await res.json()) as InvitationData;
        if (cancelled) return;
        setData(invitation);
        setSelected(invitation.choices?.map(c => c.drinkOptionId) ?? []);
      } catch {
        if (!cancelled) setMessage("Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) void load();
    return () => { cancelled = true; };
  }, [token]);

  async function save() {
    if (!data) return;
    const res = await fetch(`${API_URL}/invitations/${token}/drinks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        choices: selected.map(id => ({ drinkOptionId: id, quantity: 1 }))
      })
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      setMessage(payload?.message ?? "Enregistrement impossible.");
      return;
    }
    setMessage("Choix enregistre.");
  }

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center text-small">Chargement des boissons...</main>;
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div role="alert" className="max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-medium text-rose-950">
          {message ?? "Invitation introuvable."}
          <div className="mt-4"><Link href={`/invite/${token}/invitation`} className="btn-ghost">Retour à l’invitation</Link></div>
        </div>
      </main>
    );
  }

  const selectedCount = selected.length;
  const drinksDisabled = data.drinks.length === 0;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-6">
      <div
        className={`max-w-xl w-full card p-6 space-y-4 invite-skin ${getInvitationAnimationClass(data.event.animationStyle)}`}
        style={getInvitationThemeStyle(data.event)}
      >
        <InviteSteps token={token} current="drinks" />
        <h1 className="title-3 invite-title">Choix des boissons</h1>
        <p className="text-body-muted">Selectionnez vos boissons preferees.</p>
        <p className="text-small">
          {selectedCount} boisson{selectedCount > 1 ? "s" : ""} selectionnee{selectedCount > 1 ? "s" : ""}
        </p>

        {drinksDisabled ? (
          <div className="rounded-xl border border-primary/10 bg-background/70 px-4 py-3 text-small text-text/70">
            Le choix des boissons n'est pas active pour cette invitation.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {data.drinks.map(drink => {
              const active = selected.includes(drink.id);
              return (
                <button
                  key={drink.id}
                  type="button"
                  onClick={() =>
                    setSelected(prev =>
                      prev.includes(drink.id) ? prev.filter(id => id !== drink.id) : [...prev, drink.id]
                    )
                  }
                  className={`rounded-xl border px-3 py-2 text-left text-xs ${
                    active ? "border-accent bg-background/90" : "border-primary/15 bg-background/60"
                  }`}
                >
                  <p className="font-medium">{drink.name}</p>
                  <p className="text-small">
                    {drink.category === "ALCOHOLIC" ? "Alcoolisee" : "Soft"}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          <button className="btn-primary" onClick={save} disabled={selectedCount === 0 || drinksDisabled}>
            Enregistrer mon choix
          </button>
          <Link href={`/invite/${token}/invitation`} className="btn-ghost">
            Retour
          </Link>
        </div>
        {message && <p className="text-small">{message}</p>}
      </div>
    </main>
  );
}
