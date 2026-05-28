import { Suspense } from "react";
import { LoginClient } from "@/components/auth/LoginClient";

export default function OrganisateurLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginClient />
    </Suspense>
  );
}
