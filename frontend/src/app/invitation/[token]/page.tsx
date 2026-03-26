import { redirect } from "next/navigation";

export default function LegacyInvitationPage({ params }: { params: { token: string } }) {
  redirect(`/invite/${params.token}/invitation`);
}
