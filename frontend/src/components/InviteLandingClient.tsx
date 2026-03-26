"use client";

import Link from "next/link";
import { useState } from "react";
import type { InvitationData } from "@/components/InvitationClient";
import { InviteSteps } from "@/components/layout/InviteSteps";
import { SafeHtml } from "@/components/ui/SafeHtml";
import { getInvitationAnimationClass, getInvitationThemeStyle } from "@/lib/invitationTheme";

export function InviteLandingClient({ data, token }: { data: InvitationData; token: string }) {
  const [showCover, setShowCover] = useState(false);

  return (
    <div className="max-w-xl w-full card p-6 md:p-8 space-y-5">
      <div
        className={`invite-skin space-y-5 ${getInvitationAnimationClass(data.event.animationStyle)}`}
        style={getInvitationThemeStyle(data.event)}
      >
        <InviteSteps token={token} current="landing" />
        <div className="rounded-3xl overflow-hidden border border-primary/10 bg-white/90 shadow-sm">
          <div className="relative h-72 w-full bg-gradient-to-br from-primary/10 via-accent/10 to-white">
            {data.event.coverImageUrl ? (
              <img
                src={data.event.coverImageUrl}
                alt={`Photo de ${data.event.name}`}
                className="h-full w-full object-contain"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="uppercase tracking-[0.3em] text-[10px] text-white/80">Annonce officielle</p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight">
                {data.event.hostNames || data.event.name}
              </h1>
              <p className="mt-2 text-sm text-white/90">
                {new Date(data.event.dateTime).toLocaleString("fr-FR")} . {data.event.location}
              </p>
            </div>
            {data.event.logoUrl ? (
              <div className="absolute left-4 top-4 rounded-full bg-white/80 px-3 py-2">
                <img
                  src={data.event.logoUrl}
                  alt="Logo evenement"
                  className="h-8 w-auto max-w-[140px] object-contain"
                />
              </div>
            ) : null}
            {data.event.coverImageUrl ? (
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
          </div>
          <div className="p-5 space-y-3">
            {data.event.invitationMessage ? (
              <div className="text-body-muted rounded-xl bg-background/70 px-3 py-2">
                <SafeHtml html={data.event.invitationMessage} />
              </div>
            ) : null}
            <p className="text-body-muted">
              Bonjour {data.guest.fullName}, nous sommes heureux de vous compter parmi nos invites.
            </p>
            <Link href={`/invite/${token}/invitation`} className="btn-primary w-full">
              Voir mon invitation
            </Link>
          </div>
        </div>
      </div>

      {showCover && data.event.coverImageUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setShowCover(false)}
            className="absolute inset-0"
          />
          <div className="relative z-10 w-full max-w-4xl">
            <img
              src={data.event.coverImageUrl}
              alt={`Photo de ${data.event.name}`}
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
