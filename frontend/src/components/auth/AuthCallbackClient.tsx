"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/config";

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = useMemo(() => searchParams.get("code"), [searchParams]);
  const next = useMemo(() => searchParams.get("next") || "/dashboard", [searchParams]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function exchangeCode() {
      if (!code) {
        router.replace("/auth/login?error=google_login_failed");
        return;
      }

      try {
        const res = await fetch(`${API_URL}/auth/oauth/exchange`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ code })
        });

        const data = (await res.json().catch(() => null)) as { next?: string; message?: string } | null;
        if (!res.ok) {
          throw new Error(data?.message || "OAuth exchange failed.");
        }

        if (cancelled) return;
        router.replace(data?.next || next);
      } catch (error) {
        console.error(error);
        if (cancelled) return;
        setMessage("Impossible de finaliser la connexion securisee. Reessayez.");
        router.replace("/auth/login?error=google_login_failed");
      }
    }

    void exchangeCode();
    return () => {
      cancelled = true;
    };
  }, [code, next, router]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#14203a_0%,_#0b1220_38%,_#090f1a_100%)] px-4 py-6 text-white md:px-6 md:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:36px_36px] opacity-30" />
      <div className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-20 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-[32px] border border-white/10 bg-white/6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="h-1 bg-[linear-gradient(90deg,#0f172a,#64748b,#0f766e,#f59e0b)]" />
          <div className="grid gap-0 lg:grid-cols-[0.9fr,1.1fr]">
            <aside className="hidden flex-col justify-between border-r border-white/10 px-8 py-8 lg:flex">
              <div>
                <p className="text-[11px] uppercase tracking-[0.42em] text-white/45">Authentification</p>
                <h1 className="mt-4 max-w-sm text-4xl font-semibold leading-tight tracking-tight text-white">
                  Connexion en cours
                </h1>
                <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
                  Votre session OAuth est en cours de validation. Nous echangeons un code temporaire securise puis redirigeons vers votre espace organisateur.
                </p>
              </div>
              <div className="grid gap-4">
                <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 text-sm text-slate-200 backdrop-blur-md">
                  OAuth verifie
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 text-sm text-slate-200 backdrop-blur-md">
                  Code a usage unique
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 text-sm text-slate-200 backdrop-blur-md">
                  Redirection automatique
                </div>
              </div>
            </aside>

            <section className="flex flex-col items-center justify-center px-6 py-10 text-center md:px-10 lg:px-12">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20" />
                <span className="absolute inset-3 rounded-full border border-white/15 bg-white/8 backdrop-blur-md" />
                <span className="absolute inset-0 rounded-full border border-white/10" />
                <div className="relative h-11 w-11 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
              </div>

              <p className="mt-6 text-[11px] uppercase tracking-[0.42em] text-white/45">Connexion securisee</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">Finalisation du compte</h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300 md:text-[15px]">
                Patientez quelques secondes pendant que nous ouvrons votre session et preparons votre dashboard.
              </p>

              {message ? <p className="mt-6 text-sm text-amber-200">{message}</p> : null}

              <div className="mt-8 grid w-full gap-3 text-left">
                <div className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.16)] backdrop-blur-md">
                  <p className="text-[10px] uppercase tracking-[0.34em] text-white/45">Etape 1</p>
                  <p className="mt-1 text-sm font-medium text-white">Verification du callback OAuth</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.16)] backdrop-blur-md">
                  <p className="text-[10px] uppercase tracking-[0.34em] text-white/45">Etape 2</p>
                  <p className="mt-1 text-sm font-medium text-white">Echange du code temporaire</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.16)] backdrop-blur-md">
                  <p className="text-[10px] uppercase tracking-[0.34em] text-white/45">Etape 3</p>
                  <p className="mt-1 text-sm font-medium text-white">Redirection vers le dashboard</p>
                </div>
              </div>

              <p className="mt-8 text-xs uppercase tracking-[0.28em] text-white/45">EVENTIA | Organizer suite</p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}