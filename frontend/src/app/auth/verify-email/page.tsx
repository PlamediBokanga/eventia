import { Suspense } from "react";
import { EmailVerificationClient } from "@/components/auth/EmailVerificationClient";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <EmailVerificationClient />
    </Suspense>
  );
}
