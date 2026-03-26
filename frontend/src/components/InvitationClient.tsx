"use client";

import { useState } from "react";
import { API_URL } from "@/lib/config";
import { SafeHtml } from "@/components/ui/SafeHtml";
import { getInvitationAnimationClass, getInvitationThemeStyle } from "@/lib/invitationTheme";

type DrinkOption = {
  id: number;
  name: string;
  category: "ALCOHOLIC" | "SOFT";
};

type GiftItem = {
  id: number;
  title: string;
  description?: string | null;
  url: string;
  isCashFund: boolean;
};

type MemoryItem = {
  id: number;
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  caption?: string | null;
  uploadedByName?: string | null;
  createdAt: string;
};

type GuestbookMessage = {
  id: number;
  message: string;
  createdAt: string;
  guestName?: string | null;
};

type GuestStatus = "PENDING" | "CONFIRMED" | "CANCELED";

export type InvitationData = {
  invitation: {
    token: string;
    respondedAt: string | null;
    openedAt?: string | null;
    openCount?: number;
    invitationUrl?: string;
    qrCodeUrl?: string;
    mapsUrl?: string;
    googleCalendarUrl?: string;
  };
  guest: {
    id: number;
    fullName: string;
    status: GuestStatus;
    plusOneCount?: number;
    allergies?: string | null;
    mealPreference?: string | null;
  };
  event: {
    id: number;
    name: string;
    type: string;
    dateTime: string;
    location: string;
    address?: string | null;
    details?: string | null;
    program?: string | null;
    invitationMessage?: string | null;
    coverImageUrl?: string | null;
    hostNames?: string | null;
    logoUrl?: string | null;
    themePreset?: string | null;
    primaryColor?: string | null;
    accentColor?: string | null;
    fontFamily?: string | null;
    animationStyle?: string | null;
  };
  programItems?: {
    id: number;
    timeLabel: string;
    title: string;
    description?: string | null;
    order: number;
  }[];
  guestbookMessages?: GuestbookMessage[];
  drinks: DrinkOption[];
  gifts?: GiftItem[];
  memories?: MemoryItem[];
  choices?: {
    drinkOptionId: number;
    quantity: number;
    drinkOption: DrinkOption;
  }[];
};

export function InvitationClient({
  initial,
  mode = "full"
}: {
  initial: InvitationData;
  mode?: "full" | "invitation-only";
}) {
  const [guestStatus, setGuestStatus] = useState<GuestStatus>(initial.guest.status);
  const [selectedDrinks, setSelectedDrinks] = useState<number[]>(
    initial.choices?.map(c => c.drinkOptionId) ?? []
  );
  const [message, setMessage] = useState("");
  const [plusOneCount, setPlusOneCount] = useState<number>(initial.guest.plusOneCount ?? 0);
  const [allergies, setAllergies] = useState(initial.guest.allergies ?? "");
  const [mealPreference, setMealPreference] = useState(initial.guest.mealPreference ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [memoryUrl, setMemoryUrl] = useState("");
  const [memoryCaption, setMemoryCaption] = useState("");
  const [memoryType, setMemoryType] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [memories, setMemories] = useState<MemoryItem[]>(initial.memories ?? []);
  const [loadingAction, setLoadingAction] = useState<
    "confirm" | "cancel" | "guestbook" | "drinks" | null
  >(null);
  const [showCover, setShowCover] = useState(false);

  const eventDate = new Date(initial.event.dateTime);
  const programItems = initial.programItems ?? [];
  const dateLabel = Number.isNaN(eventDate.getTime())
    ? initial.event.dateTime
    : eventDate.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
  const timeLabel = Number.isNaN(eventDate.getTime())
    ? ""
    : eventDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  async function callPost(path: string, body?: unknown) {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      throw new Error(`Erreur API ${res.status}`);
    }
    return res.json();
  }

  async function handleConfirm() {
    try {
      setLoadingAction("confirm");
      setFeedback(null);
      await callPost(`/invitations/${initial.invitation.token}/confirm`, {
        plusOneCount,
        allergies,
        mealPreference
      });
      setGuestStatus("CONFIRMED");
      setFeedback("Merci, votre presence est confirmee.");
    } catch {
      setFeedback("Impossible de confirmer pour le moment. Reessayez plus tard.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleCancel() {
    try {
      setLoadingAction("cancel");
      setFeedback(null);
      await callPost(`/invitations/${initial.invitation.token}/cancel`, {
        plusOneCount,
        allergies,
        mealPreference
      });
      setGuestStatus("CANCELED");
      setFeedback("Votre absence a bien ete enregistree.");
    } catch {
      setFeedback("Impossible d'enregistrer l'annulation. Reessayez plus tard.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleGuestbook() {
    if (!message.trim()) {
      setFeedback("Veuillez ecrire un message avant d'envoyer.");
      return;
    }

    try {
      setLoadingAction("guestbook");
      setFeedback(null);
      await callPost(`/invitations/${initial.invitation.token}/guestbook`, {
        message
      });
      setFeedback("Merci pour votre message.");
      setMessage("");
    } catch {
      setFeedback("Impossible d'enregistrer votre message. Reessayez plus tard.");
    } finally {
      setLoadingAction(null);
    }
  }

  function toggleDrink(drinkId: number) {
    setSelectedDrinks(prev =>
      prev.includes(drinkId) ? prev.filter(id => id !== drinkId) : [...prev, drinkId]
    );
  }

  async function handleSaveDrinks() {
    try {
      setLoadingAction("drinks");
      setFeedback(null);
      await callPost(`/invitations/${initial.invitation.token}/drinks`, {
        choices: selectedDrinks.map(id => ({
          drinkOptionId: id,
          quantity: 1
        }))
      });
      setFeedback("Vos preferences de boissons ont ete enregistrees.");
    } catch {
      setFeedback("Impossible d'enregistrer vos boissons. Reessayez plus tard.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleUploadMemoryImage(file: File) {
    try {
      setLoadingAction("guestbook");
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("File read failed"));
        reader.readAsDataURL(file);
      });
      const payload = (await callPost(`/invitations/${initial.invitation.token}/upload-media`, {
        fileName: file.name,
        dataUrl
      })) as { url: string };
      setMemoryUrl(payload.url);
      setMemoryType("IMAGE");
      setFeedback("Image telechargee. Ajoutez une legende puis publiez.");
    } catch {
      setFeedback("Upload photo souvenir impossible.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleAddMemory() {
    if (!memoryUrl.trim()) {
      setFeedback("Ajoutez un lien media ou telechargez une image.");
      return;
    }
    try {
      setLoadingAction("guestbook");
      const memory = (await callPost(`/invitations/${initial.invitation.token}/memories`, {
        mediaType: memoryType,
        mediaUrl: memoryUrl.trim(),
        caption: memoryCaption || null
      })) as MemoryItem;
      setMemories(prev => [memory, ...prev]);
      setMemoryUrl("");
      setMemoryCaption("");
      setFeedback("Souvenir ajoute.");
    } catch {
      setFeedback("Impossible d'ajouter ce souvenir.");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div
      className={`space-y-5 invite-skin ${getInvitationAnimationClass(initial.event.animationStyle)}`}
      style={getInvitationThemeStyle(initial.event)}
    >
      <div className="rounded-3xl border border-primary/10 bg-white/90 shadow-sm overflow-hidden">
        <div className="relative">
          <div className="relative h-72 w-full bg-gradient-to-br from-primary/15 via-accent/10 to-white">
            {initial.event.coverImageUrl ? (
              <img
                src={initial.event.coverImageUrl}
                alt={`Photo de ${initial.event.name}`}
                className="h-full w-full object-contain"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          </div>
          {initial.event.coverImageUrl ? (
            <div className="absolute right-4 top-4">
              <button
                type="button"
                onClick={() => setShowCover(true)}
                className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-text shadow-sm"
              >
                Voir l'image complete
              </button>
            </div>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="uppercase tracking-[0.3em] text-[10px] text-white/80">Invitation officielle</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">
              {initial.event.hostNames || initial.event.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-white/15 px-3 py-1">{dateLabel}</span>
              {timeLabel ? <span className="rounded-full bg-white/15 px-3 py-1">{timeLabel}</span> : null}
            </div>
          </div>
          {initial.event.logoUrl ? (
            <div className="absolute left-4 top-4 rounded-full bg-white/80 px-3 py-2">
              <img
                src={initial.event.logoUrl}
                alt="Logo evenement"
                className="h-8 w-auto max-w-[140px] object-contain"
              />
            </div>
          ) : null}
        </div>
        <div className="p-5 space-y-4">
          <div className="text-sm text-textSecondary">
            <p className="uppercase tracking-[0.2em] text-[10px] invite-accent">Cher(e) invite(e)</p>
            <p className="mt-2 text-base text-text">
              {initial.guest.fullName}, vous etes invite(e) a{" "}
              <span className="font-semibold">{initial.event.name}</span>.
            </p>
          </div>
          {initial.event.invitationMessage ? (
            <div className="rounded-2xl bg-background/70 px-4 py-3 text-sm text-textSecondary">
              <SafeHtml html={initial.event.invitationMessage} />
            </div>
          ) : null}
          <div className="grid gap-3 text-sm">
            <div className="rounded-2xl border border-primary/10 bg-background/70 px-4 py-3">
              <p className="text-small">Date et lieu</p>
              <p className="font-medium text-text">
                {dateLabel} {timeLabel ? `- ${timeLabel}` : ""} . {initial.event.location}
              </p>
              {initial.event.address ? <p className="mt-1 text-small">{initial.event.address}</p> : null}
            </div>
            {initial.event.details ? (
              <div className="rounded-2xl border border-primary/10 bg-background/70 px-4 py-3">
                <p className="text-small">Programme / details</p>
                <p className="font-medium whitespace-pre-line">{initial.event.details}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-primary/10 bg-white/90 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="uppercase tracking-[0.2em] text-[10px] invite-accent">Controle d'acces</p>
            <h2 className="title-4 mt-2">Votre code QR</h2>
            <p className="text-small text-textSecondary">
              Presentez ce code a l'entree pour faciliter votre accueil.
            </p>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-background/70 p-3">
            {initial.invitation.qrCodeUrl ? (
              <img
                src={initial.invitation.qrCodeUrl}
                alt="QR invitation"
                className="h-32 w-32 rounded-xl border border-primary/15 bg-white p-1"
              />
            ) : (
              <div className="h-32 w-32 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center text-[10px] text-white/80">
                {initial.invitation.token.slice(0, 10)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-primary/10 bg-white/90 p-5">
        <p className="uppercase tracking-[0.2em] text-[10px] invite-accent">Programme</p>
        <h2 className="title-4 mt-2">Deroulement de la soiree</h2>
        {programItems.length > 0 ? (
          <div className="mt-4 space-y-4">
            {programItems.map((item, index) => (
              <div key={item.id} className="grid grid-cols-[86px,1fr] gap-3">
                <div className="relative flex items-start gap-2">
                  <div className="min-w-[64px] text-sm font-semibold text-text">{item.timeLabel}</div>
                  <div className="relative mt-1 flex h-full w-4 flex-col items-center">
                    <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_0_4px_rgba(212,175,55,0.15)]" />
                    {index < programItems.length - 1 ? (
                      <span className="mt-2 h-full w-[2px] bg-accent/40" />
                    ) : null}
                  </div>
                </div>
                <div className="rounded-2xl border border-accent/20 bg-background/70 px-4 py-3">
                  <p className="text-sm font-semibold text-text">{item.title}</p>
                  {item.description ? (
                    <p className="text-small text-textSecondary">{item.description}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : initial.event.program || initial.event.details ? (
          <p className="mt-2 text-body-muted whitespace-pre-line">
            {initial.event.program || initial.event.details}
          </p>
        ) : (
          <p className="mt-2 text-body-muted">
            Le programme detaille sera communique par l'organisateur.
          </p>
        )}
      </div>

      <div className="rounded-3xl border border-primary/10 bg-white/90 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="uppercase tracking-[0.2em] text-[10px] invite-accent">Preferences</p>
            <h2 className="title-4 mt-2">Confirmer votre presence</h2>
          </div>
          <div className="text-right">
            <p className="text-small">Statut</p>
            <p
              className={`font-semibold ${
                guestStatus === "CONFIRMED"
                  ? "text-green-700"
                  : guestStatus === "CANCELED"
                    ? "text-red-700"
                    : "text-yellow-700"
              }`}
            >
              {guestStatus === "PENDING" && "En attente"}
              {guestStatus === "CONFIRMED" && "Confirme"}
              {guestStatus === "CANCELED" && "Annule"}
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            type="number"
            min={0}
            className="rounded-lg border border-primary/20 bg-white/70 px-3 py-2 text-xs"
            value={plusOneCount}
            onChange={e => setPlusOneCount(Math.max(0, Number(e.target.value) || 0))}
            placeholder="+1"
          />
          <input
            className="rounded-lg border border-primary/20 bg-white/70 px-3 py-2 text-xs"
            value={mealPreference}
            onChange={e => setMealPreference(e.target.value)}
            placeholder="Preference repas"
          />
          <input
            className="rounded-lg border border-primary/20 bg-white/70 px-3 py-2 text-xs"
            value={allergies}
            onChange={e => setAllergies(e.target.value)}
            placeholder="Allergies"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="btn-primary w-full"
            type="button"
            onClick={handleConfirm}
            disabled={loadingAction === "confirm"}
          >
            {loadingAction === "confirm" ? "Confirmation..." : "Je confirme ma presence"}
          </button>
          <button
            className="btn-ghost w-full"
            type="button"
            onClick={handleCancel}
            disabled={loadingAction === "cancel"}
          >
            {loadingAction === "cancel" ? "Enregistrement..." : "Je ne pourrai pas venir"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`${API_URL}/invitations/${initial.invitation.token}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost px-4 py-1 text-xs inline-flex"
          >
            Telecharger le PDF
          </a>
          {initial.invitation.mapsUrl ? (
            <a href={initial.invitation.mapsUrl} target="_blank" rel="noreferrer" className="btn-ghost px-4 py-1 text-xs inline-flex">
              Ouvrir GPS
            </a>
          ) : null}
          {initial.invitation.googleCalendarUrl ? (
            <a href={initial.invitation.googleCalendarUrl} target="_blank" rel="noreferrer" className="btn-ghost px-4 py-1 text-xs inline-flex">
              Ajouter au calendrier
            </a>
          ) : null}
          <a
            href={`/invite/${initial.invitation.token}/guestbook`}
            className="btn-ghost px-4 py-1 text-xs inline-flex"
          >
            Ouvrir le livre d'or
          </a>
          <a href={`/invite/${initial.invitation.token}/chat`} className="btn-ghost px-4 py-1 text-xs inline-flex">
            Ouvrir le chat
          </a>
          <a
            href={`/invite/${initial.invitation.token}/drinks`}
            className="btn-ghost px-4 py-1 text-xs inline-flex"
          >
            Choix des boissons
          </a>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        {mode === "full" && initial.drinks.length > 0 && (
          <div>
            <p className="text-small mb-1">Vos boissons</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {initial.drinks.map(drink => {
                const active = selectedDrinks.includes(drink.id);
                return (
                  <button
                    key={drink.id}
                    type="button"
                    onClick={() => toggleDrink(drink.id)}
                    className={`rounded-xl border px-3 py-2 text-xs text-left transition ${
                      active
                        ? "border-accent bg-background/80"
                        : "border-primary/15 bg-background/60"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{drink.name}</span>
                      <span className="text-[9px] uppercase text-text/60">
                        {drink.category === "ALCOHOLIC" ? "Alcoolisee" : "Soft"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="btn-ghost px-4 py-1 text-xs"
              onClick={handleSaveDrinks}
              disabled={loadingAction === "drinks"}
            >
              {loadingAction === "drinks" ? "Enregistrement..." : "Enregistrer mes boissons"}
            </button>
          </div>
        )}

        {mode === "full" && (initial.gifts?.length ?? 0) > 0 && (
          <div>
            <p className="text-small mb-1">Liste de cadeaux</p>
            <div className="space-y-2">
              {initial.gifts?.map(gift => (
                <a
                  key={gift.id}
                  href={gift.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-primary/15 bg-background/70 px-3 py-2 hover:bg-background/85"
                >
                  <p className="text-xs font-semibold">{gift.title}</p>
                  {gift.description ? <p className="text-small">{gift.description}</p> : null}
                  <p className="text-[10px] text-text/60">{gift.isCashFund ? "Cagnotte" : "Cadeau"}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        {mode === "full" && (
          <div className="space-y-2">
            <p className="text-small mb-1">Album photo/video</p>
            <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-2">
              <select
                className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
                value={memoryType}
                onChange={e => setMemoryType(e.target.value as "IMAGE" | "VIDEO")}
              >
                <option value="IMAGE">Photo</option>
                <option value="VIDEO">Video</option>
              </select>
              <input
                className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
                value={memoryUrl}
                onChange={e => setMemoryUrl(e.target.value)}
                placeholder="Lien media (https://...)"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto] gap-2">
              <input
                className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
                value={memoryCaption}
                onChange={e => setMemoryCaption(e.target.value)}
                placeholder="Legende (optionnel)"
              />
              <label className="btn-ghost px-3 py-2 text-xs cursor-pointer text-center">
                Telecharger photo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                    if (!file) return;
                    void handleUploadMemoryImage(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <button
              type="button"
              className="btn-ghost px-4 py-1 text-xs"
              onClick={handleAddMemory}
              disabled={loadingAction === "guestbook"}
            >
              {loadingAction === "guestbook" ? "Publication..." : "Publier le souvenir"}
            </button>

            {memories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {memories.map(item => (
                  <div key={item.id} className="rounded-xl border border-primary/15 bg-background/70 p-2">
                    {item.mediaType === "IMAGE" ? (
                      <img
                        src={item.mediaUrl}
                        alt={item.caption || "Souvenir"}
                        className="h-28 w-full rounded-lg object-cover border border-primary/10"
                      />
                    ) : (
                      <a href={item.mediaUrl} target="_blank" rel="noreferrer" className="underline text-xs">
                        Ouvrir la video
                      </a>
                    )}
                    {item.caption ? <p className="mt-1 text-small">{item.caption}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-small">Aucun souvenir publie pour le moment.</p>
            )}
          </div>
        )}

        {mode === "full" && (
          <div>
            <p className="text-small mb-1">Votre message (livre d'or)</p>
            <textarea
              className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Laissez un mot aux organisateurs..."
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                className="btn-ghost px-4 py-1 text-xs"
                onClick={handleGuestbook}
                disabled={loadingAction === "guestbook"}
              >
                {loadingAction === "guestbook" ? "Envoi..." : "Envoyer le message"}
              </button>
            </div>
          </div>
        )}

        {feedback && (
          <p className="text-small bg-background/80 rounded-xl px-3 py-2">{feedback}</p>
        )}
      </div>

      {showCover && initial.event.coverImageUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setShowCover(false)}
            className="absolute inset-0"
          />
          <div className="relative z-10 w-full max-w-4xl">
            <img
              src={initial.event.coverImageUrl}
              alt={`Photo de ${initial.event.name}`}
              className="max-h-[85vh] w-full rounded-2xl object-contain bg-black"
            />
            <button
              type="button"
              onClick={() => setShowCover(false)}
              className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-text shadow-sm"
            >
              Fermer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
