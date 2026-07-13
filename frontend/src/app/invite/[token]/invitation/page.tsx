import { API_URL } from "@/lib/config";
import { InvitationClient, type InvitationData } from "@/components/InvitationClient";
import { InviteSteps } from "@/components/layout/InviteSteps";

interface InvitationPageProps {
  params: Promise<{
    token: string;
  }>;
}

async function fetchInvitation(token: string): Promise<InvitationData | null> {
  try {
    const res = await fetch(`${API_URL}/invitations/${token}`, {
      cache: "no-store"
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as InvitationData;
    return data;
  } catch {
    return null;
  }
}

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { token } = await params;
  const data = await fetchInvitation(token);

  if (!data) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-3 py-6 md:px-6 md:py-10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-center">
          <div className="w-full max-w-xl space-y-4 rounded-[32px] border border-white/70 bg-white/85 p-6 text-center shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-8">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Acces invite</p>
            <h1 className="text-3xl font-semibold text-slate-900">Invitation introuvable</h1>
            <p className="text-sm leading-6 text-slate-600">
              Le lien que vous avez suivi n'est pas valide ou n'est plus actif. Verifiez avec l'organisateur de
              l'evenement.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-3 py-4 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 md:gap-5">
        <InviteSteps token={token} current="invitation" />
        <InvitationClient initial={data} mode="invitation-only" />
      </div>
    </main>
  );
}

