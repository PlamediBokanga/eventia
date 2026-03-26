import { redirect } from "next/navigation";

export default function LegacyOrganizerLoginPage() {
  redirect("/auth/login");
}
