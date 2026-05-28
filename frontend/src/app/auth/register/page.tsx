import { Suspense } from "react";
import { RegisterClient } from "@/components/auth/RegisterClient";

export default function OrganisateurRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <RegisterClient />
    </Suspense>
  );
}
