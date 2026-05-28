"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveToken } from "@/lib/auth";

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token"), [searchParams]);
  const next = useMemo(() => searchParams.get("next") || "/dashboard", [searchParams]);

  useEffect(() => {
    if (!token) {
      router.replace("/auth/login?error=google_login_failed");
      return;
    }
    saveToken(token);
    router.replace(next);
  }, [next, router, token]);

  return (
    <main className="min-h-screen grid place-items-center bg-[linear-gradient(135deg,_#f7f4ec_0%,_#e7efe9_48%,_#d7e5f4_100%)] px-4">
      <div className="card max-w-md space-y-3 p-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary/55">Authentification</p>
        <h1 className="title-3">Connexion en cours</h1>
        <p className="text-body-muted">Votre session est en train d'etre ouverte. Redirection vers le dashboard...</p>
      </div>
    </main>
  );
}
