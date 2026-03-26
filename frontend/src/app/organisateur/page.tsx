import { redirect } from "next/navigation";

export default function LegacyOrganizerPage() {
  redirect("/auth/login");
}
