import { redirect } from "next/navigation";

export default function LegacyOrganizerRegisterPage() {
  redirect("/auth/register");
}
