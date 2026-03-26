"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authFetch } from "@/lib/dashboard";
import { Button } from "@/components/ui/Button";

export default function CoOrganizerAcceptPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params?.token;
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string>("Confirmez votre invitation.");

  useEffect(() => {
    setStatus("idle");
    setMessage("Confirmez votre invitation.");
  }, [token]);

  async function acceptInvite() {
    if (!token) return;
    setStatus("loading");
    const res = await authFetch(`/events/co-organizers/accept/${token}`, { method: "POST" });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      setStatus("error");
      setMessage(payload?.message ?? "Impossible d'accepter l'invitation.");
      return;
    }
    setStatus("ok");
    setMessage("Invitation acceptee. Redirection vers le dashboard...");
    window.setTimeout(() => router.push("/dashboard/events"), 1200);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-primary/10 bg-white/70 p-6 shadow-sm">
        <h1 className="title-4">Invitation co-organisateur</h1>
        <p className="mt-2 text-body-muted">{message}</p>
        <div className="mt-4 flex gap-2">
          <Button type="button" className="w-full" onClick={acceptInvite} disabled={status === "loading"}>
            {status === "loading" ? "Validation..." : "Accepter"}
          </Button>
        </div>
        {status === "error" ? (
          <p className="mt-3 text-small text-red-600">
            Connectez-vous d'abord si vous n'etes pas connecte.
          </p>
        ) : null}
      </div>
    </main>
  );
}
