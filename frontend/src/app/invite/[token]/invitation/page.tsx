import { API_URL } from "@/lib/config";
import { InvitationClient, type InvitationData } from "@/components/InvitationClient";
import { InviteSteps } from "@/components/layout/InviteSteps";

interface InvitationPageProps {
  params: {
    token: string;
  };
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
  const { token } = params;
  const data = await fetchInvitation(token);

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-xl w-full card p-6 md:p-8 space-y-4 text-center">
          <h1 className="title-3 mb-2">Invitation introuvable</h1>
          <p className="text-body-muted">
            Le lien que vous avez suivi n'est pas valide ou n'est plus actif. Verifiez avec l'organisateur de
            l'evenement.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-6">
      <div className="max-w-xl w-full card p-6 md:p-8 space-y-4">
        <InviteSteps token={token} current="invitation" />
        <InvitationClient initial={data} mode="invitation-only" />
      </div>
    </main>
  );
}
