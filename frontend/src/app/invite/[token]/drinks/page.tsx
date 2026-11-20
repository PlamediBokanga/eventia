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
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_URL}/invitations/${token}`);
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { message?: string } | null;
          if (!cancelled) {
            setMessageTone("error");
            setMessage(payload?.message ?? `Invitation indisponible (HTTP ${res.status}).`);
          }
          return;
        }
        const invitation = (await res.json()) as InvitationData;
        if (cancelled) return;
        setData(invitation);
        setSelected(invitation.choices?.map(c => c.drinkOptionId) ?? []);
      } catch {
        if (!cancelled) {
          setMessageTone("error");
          setMessage("Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) void load();
    return () => { cancelled = true; };
  }, [token]);

  async function save() {
    if (!data) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/invitations/${token}/drinks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choices: selected.map(id => ({ drinkOptionId: id, quantity: 1 }))
        })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        setMessageTone("error");
        setMessage(payload?.message ?? "Enregistrement impossible.");
        return;
      }
      setMessageTone("success");
      setMessage("Votre choix a bien été enregistré.");
    } catch {
      setMessageTone("error");
      setMessage("Impossible de joindre le serveur. Vérifiez votre connexion, puis réessayez.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center px-4 py-10"><p className="rounded-2xl border border-white/80 bg-white/90 px-5 py-4 text-sm font-medium text-slate-700 shadow-sm" role="status">Chargement des boissons...</p></main>;
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
    <main className="min-h-screen px-3 pb-10 pt-3 sm:px-6 sm:pb-12 sm:pt-6">
      <div
        className={`mx-auto w-full max-w-3xl space-y-5 rounded-3xl border border-white/80 bg-white/90 p-4 shadow-xl shadow-[#526b5c]/10 backdrop-blur-xl sm:p-6 invite-skin ${getInvitationAnimationClass(data.event.animationStyle)}`}
        style={getInvitationThemeStyle(data.event)}
      >
        <InviteSteps token={token} current="drinks" />
        <header className="flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#526b5c]">Vos préférences</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">Choix des boissons</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Sélectionnez les boissons de votre choix. Vous pourrez modifier votre réponse avant l’événement.</p>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-[#cbd8cf] bg-[#edf2ee] px-3 py-1.5 text-xs font-semibold text-[#43584b]" aria-live="polite">
            {selectedCount} sélectionnée{selectedCount === 1 ? "" : "s"}
          </span>
        </header>

        {drinksDisabled ? (
          <div className="rounded-xl border border-primary/10 bg-background/70 px-4 py-3 text-small text-text/70">
            Le choix des boissons n’est pas activé pour cette invitation.
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {data.drinks.map(drink => {
              const active = selected.includes(drink.id);
              return (
                <button
                  key={drink.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setSelected(prev =>
                      prev.includes(drink.id) ? prev.filter(id => id !== drink.id) : [...prev, drink.id]
                    )
                  }
                  className={`min-h-[76px] rounded-2xl border px-4 py-3 text-left transition ${
                    active ? "border-[#526b5c] bg-[#f2f6f2] ring-1 ring-[#526b5c]/20" : "border-slate-200 bg-white hover:border-[#9aafa0] hover:bg-[#fafcf9]"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{drink.name}</span>
                    <span aria-hidden="true" className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] ${active ? "border-[#526b5c] bg-[#526b5c] text-white" : "border-slate-300 text-transparent"}`}>✓</span>
                  </span>
                  <span className="mt-2 block text-xs text-slate-500">{drink.category === "ALCOHOLIC" ? "Alcoolisée" : "Sans alcool"}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200/80 pt-4 sm:flex-row sm:justify-end">
          <Link href={`/invite/${token}/invitation`} className="btn-ghost inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold">
              Retour à l’invitation
          </Link>
          <button className="btn-primary min-h-11 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50" onClick={save} disabled={saving || drinksDisabled}>
            {saving ? "Enregistrement..." : "Enregistrer mon choix"}
          </button>
        </div>
        {message && <p role={messageTone === "error" ? "alert" : "status"} aria-live="polite" className={`rounded-xl border px-4 py-3 text-sm ${messageTone === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-[#cbd8cf] bg-[#f3f6f3] text-[#34483a]"}`}>{message}</p>}
      </div>
    </main>
  );
}
