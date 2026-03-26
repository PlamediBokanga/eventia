import Link from "next/link";
import { API_URL } from "@/lib/config";
import type { InvitationData } from "@/components/InvitationClient";
import { InviteSteps } from "@/components/layout/InviteSteps";
import { SafeHtml } from "@/components/ui/SafeHtml";
import { getInvitationAnimationClass, getInvitationThemeStyle } from "@/lib/invitationTheme";
import { InviteLandingClient } from "@/components/InviteLandingClient";

interface InviteLandingProps {
  params: { token: string };
}

async function fetchInvitation(token: string): Promise<InvitationData | null> {
  try {
    const res = await fetch(`${API_URL}/invitations/${token}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as InvitationData;
  } catch {
    return null;
  }
}

export default async function InviteLandingPage({ params }: InviteLandingProps) {
  const data = await fetchInvitation(params.token);

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-xl w-full card p-6 md:p-8 text-center">
          <h1 className="title-3 mb-3">Invitation introuvable</h1>
          <p className="text-body-muted">
            Le lien d'invitation n'est pas valide ou n'est plus actif.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-6">
      <InviteLandingClient data={data} token={params.token} />
    </main>
  );
}
