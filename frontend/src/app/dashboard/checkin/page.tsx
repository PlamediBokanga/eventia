"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Header } from "@/components/layout/Header";
import { EventItem, authFetch, getSelectedEventId, setSelectedEventId } from "@/lib/dashboard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

type ScanResult = {
  token: string;
  status: "ok" | "error" | "offline";
  message: string;
  guestName?: string;
  guestStatus?: "PENDING" | "CONFIRMED" | "CANCELED";
  tableLabel?: string | null;
  checkedInAt?: string;
  checkInCount?: number;
  alreadyCheckedIn?: boolean;
  action?: "IN" | "OUT";
};

type OfflineScan = {
  id: string;
  token: string;
  scannedAt: string;
  action: "IN" | "OUT";
};

const OFFLINE_KEY = "eventia_checkin_queue";

function extractToken(input: string) {
  const trimmed = input.trim();
  const tokenMatch = trimmed.match(/[a-f0-9]{32}/i);
  return tokenMatch ? tokenMatch[0] : "";
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function DashboardCheckinPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [stats, setStats] = useState({ totalGuests: 0, present: 0, remaining: 0 });
  const [scanning, setScanning] = useState(false);
  const [mode, setMode] = useState<"SCAN" | "MANUAL">("SCAN");
  const [rapidMode, setRapidMode] = useState(true);
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [manualToken, setManualToken] = useState("");
  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState<
    Array<{
      id: number;
      fullName: string;
      status: "PENDING" | "CONFIRMED" | "CANCELED";
      phone?: string | null;
      table?: { id: number; label: string } | null;
      invitation?: { token: string; checkedInAt?: string | null } | null;
    }>
  >([]);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<OfflineScan[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScanAtRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const { pushToast } = useToast();

  function stopScanner(reader: BrowserMultiFormatReader | null) {
    if (!reader) return;
    const anyReader = reader as unknown as {
      reset?: () => void;
      stopContinuousDecode?: () => void;
    };
    anyReader.stopContinuousDecode?.();
    anyReader.reset?.();
  }

  useEffect(() => {
    const stored = window.localStorage.getItem(OFFLINE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Array<Partial<OfflineScan>>;
        setOfflineQueue(
          parsed.map(item => ({
            id: item.id ?? createId(),
            token: item.token ?? "",
            scannedAt: item.scannedAt ?? new Date().toISOString(),
            action: item.action ?? "IN"
          }))
        );
      } catch {
        setOfflineQueue([]);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(OFFLINE_KEY, JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  useEffect(() => {
    async function load() {
      const res = await authFetch("/events");
      if (!res.ok) return;
      const data = (await res.json()) as EventItem[];
      setEvents(data);
      if (data.length > 0) {
        const savedId = getSelectedEventId();
        const chosen = (savedId && data.find(e => e.id === savedId)) || data[0];
        setSelectedEvent(chosen);
        setSelectedEventId(chosen.id);
      }
    }
    void load();
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    void refreshStats();
  }, [selectedEvent?.id]);

  async function refreshStats() {
    if (!selectedEvent) return;
    const res = await authFetch(`/events/${selectedEvent.id}/checkin/stats`);
    if (!res.ok) return;
    const payload = (await res.json()) as { totalGuests: number; present: number; remaining: number };
    setStats(payload);
  }

  useEffect(() => {
    if (!scanning) {
      stopScanner(readerRef.current);
      readerRef.current = null;
      return;
    }
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let cancelled = false;

    async function start() {
      if (!videoRef.current) return;
      try {
        let deviceId: string | undefined = undefined;
        try {
          const devices = await BrowserMultiFormatReader.listVideoInputDevices();
          if (devices.length > 0) {
            const preferred = devices.find(d => /back|rear|environment/i.test(d.label));
            deviceId = (preferred ?? devices[devices.length - 1]).deviceId;
          }
        } catch {
          deviceId = undefined;
        }

        await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
          if (cancelled) return;
          if (result) {
            const text = result.getText();
            const token = extractToken(text);
            if (token) {
              void handleScan(token);
            }
          }
          if (err && err.name !== "NotFoundException") {
            if (err.name === "NotAllowedError") {
              pushToast("Autorisation camera refusee. Autorisez la camera dans le navigateur.", "error");
            } else if (err.name === "NotReadableError") {
              pushToast("Camera utilisee par une autre application.", "error");
            } else {
              pushToast("Camera indisponible.", "error");
            }
          }
        });
      } catch {
        pushToast("Impossible d'acceder a la camera.", "error");
      }
    }

    void start();
    return () => {
      cancelled = true;
      stopScanner(reader);
    };
  }, [scanning]);

  useEffect(() => {
    if (mode === "MANUAL") {
      setScanning(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!fullscreen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [fullscreen]);

  const recentTokens = useMemo(() => new Set(results.map(r => r.token)), [results]);

  function playBeep(kind: "success" | "error" | "warning") {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = audioCtxRef.current ?? new AudioContextClass();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = kind === "success" ? 880 : kind === "warning" ? 440 : 220;
      gain.gain.value = 0.08;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // ignore audio errors
    }
  }

  function guestStatusLabel(status?: ScanResult["guestStatus"]) {
    if (status === "CONFIRMED") return "Confirme";
    if (status === "CANCELED") return "Annule";
    return status ? "En attente" : "-";
  }

  function guestStatusClass(status?: ScanResult["guestStatus"]) {
    if (status === "CONFIRMED") return "bg-green-100 text-green-700";
    if (status === "CANCELED") return "bg-red-100 text-red-700";
    if (status === "PENDING") return "bg-amber-100 text-amber-700";
    return "bg-primary/5 text-text/60";
  }

  async function handleScan(token: string, actionOverride?: "IN" | "OUT") {
    if (!token || recentTokens.has(token)) return;
    const now = Date.now();
    const minGap = rapidMode ? 1500 : 2000;
    if (now - lastScanAtRef.current < minGap) return;
    lastScanAtRef.current = now;
    const actionToSend = actionOverride ?? direction;
    if (!navigator.onLine) {
      enqueueOffline(token, actionToSend);
      const offlineResult = {
        token,
        status: "offline" as const,
        message: "Enregistre hors ligne. Synchronisez plus tard.",
        action: actionToSend
      };
      setCurrentResult(offlineResult);
      playBeep("warning");
      setResults(prev => [offlineResult, ...prev]);
      return;
    }
    try {
      const res = await authFetch("/events/checkin/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: actionToSend })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      const errorResult = {
        token,
        status: "error" as const,
        message: payload?.message ?? "Scan refuse.",
        action: actionToSend
      };
        setCurrentResult(errorResult);
        playBeep("error");
        setResults(prev => [errorResult, ...prev]);
        return;
      }
      const payload = (await res.json()) as {
        alreadyCheckedIn?: boolean;
        checkedInAt?: string;
        checkInCount?: number;
        guest?: {
          fullName?: string;
          status?: "PENDING" | "CONFIRMED" | "CANCELED";
          table?: { id: number; label: string } | null;
        };
      };
      const okMessage = actionToSend === "OUT"
        ? payload.alreadyCheckedIn
          ? "Sortie enregistree."
          : "Invite non encore enregistre."
        : payload.alreadyCheckedIn
          ? "Invite deja enregistre."
          : "Entree validee.";
      const okResult = {
        token,
        status: "ok" as const,
        message: okMessage,
        guestName: payload.guest?.fullName,
        guestStatus: payload.guest?.status,
        tableLabel: payload.guest?.table?.label ?? null,
        checkedInAt: payload.checkedInAt,
        checkInCount: payload.checkInCount,
        alreadyCheckedIn: payload.alreadyCheckedIn,
        action: actionToSend
      };
      setCurrentResult(okResult);
      playBeep(payload.alreadyCheckedIn ? "warning" : "success");
      setResults(prev => [okResult, ...prev]);
      void refreshStats();
    } catch {
      enqueueOffline(token, actionToSend);
      const offlineResult = {
        token,
        status: "offline" as const,
        message: "Erreur reseau. Enregistre hors ligne.",
        action: actionToSend
      };
      setCurrentResult(offlineResult);
      playBeep("warning");
      setResults(prev => [offlineResult, ...prev]);
    }
    if (rapidMode) {
      window.setTimeout(() => {
        setCurrentResult(prev => (prev?.token === token ? null : prev));
      }, 2000);
    }
  }

  function enqueueOffline(token: string, action: "IN" | "OUT") {
    setOfflineQueue(prev => [
      { id: createId(), token, scannedAt: new Date().toISOString(), action },
      ...prev
    ]);
  }

  async function syncOffline() {
    if (offlineQueue.length === 0 || syncing) return;
    setSyncing(true);
    const remaining: OfflineScan[] = [];
    for (const item of offlineQueue) {
      try {
        const res = await authFetch("/events/checkin/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: item.token, action: item.action })
        });
        if (!res.ok) {
          remaining.push(item);
          continue;
        }
      } catch {
        remaining.push(item);
      }
    }
    setOfflineQueue(remaining);
    pushToast(remaining.length === 0 ? "Synchronisation terminee." : "Synchronisation partielle.");
    setSyncing(false);
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = extractToken(manualToken);
    if (!token) {
      pushToast("Token invalide.", "error");
      return;
    }
    setManualToken("");
    await handleScan(token);
  }

  async function searchManual() {
    if (!selectedEvent) return;
    const query = manualQuery.trim();
    if (!query) {
      setManualResults([]);
      return;
    }
    const res = await authFetch(`/events/${selectedEvent.id}/checkin/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) {
      pushToast("Recherche impossible.", "error");
      return;
    }
    setManualResults((await res.json()) as typeof manualResults);
  }

  async function handleManualAction(token?: string | null, action: "IN" | "OUT" = "IN") {
    if (!token) {
      pushToast("Invitation introuvable.", "error");
      return;
    }
    await handleScan(token, action);
  }

  function escapeCsv(value: string) {
    const needsQuote = /[",\n]/.test(value);
    const escaped = value.replace(/"/g, "\"\"");
    return needsQuote ? `"${escaped}"` : escaped;
  }

  function exportResultsCsv() {
    const headers = ["Invite", "Statut", "Message", "Heure check-in", "Nb scans", "Token"];
    const rows = results.map(item => [
      item.guestName ?? "Invite",
      item.status,
      item.message,
      item.checkedInAt ? new Date(item.checkedInAt).toLocaleString("fr-FR") : "",
      String(item.checkInCount ?? 0),
      item.token
    ]);
    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map(row => row.map(value => escapeCsv(String(value))).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "checkin-resultats.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportResultsPdf() {
    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable")
    ]);
    const autoTable = autoTableModule.default;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    doc.setFontSize(14);
    doc.text("Controle QR - Resultats", 40, 40);
    autoTable(doc, {
      startY: 60,
      head: [["Invite", "Statut", "Message", "Heure check-in", "Nb scans", "Token"]],
      body: results.map(item => [
        item.guestName ?? "Invite",
        item.status,
        item.message,
        item.checkedInAt ? new Date(item.checkedInAt).toLocaleString("fr-FR") : "",
        String(item.checkInCount ?? 0),
        item.token
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [30, 41, 59] }
    });
    doc.save("checkin-resultats.pdf");
  }

  return (
    <main className={fullscreen ? "space-y-4 p-4 min-h-screen" : "space-y-4"}>
      <Header title="Scanner des invitations" />
      <section className="card p-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="title-4">Scanner des invitations</h2>
            <p className="text-small text-textSecondary">
              Scannez rapidement les QR codes et suivez l'affluence en temps reel.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {events.length === 0 ? (
              <div className="min-w-[220px] rounded-full border border-primary/10 bg-background/70 px-3 py-2 text-[11px] text-text/60">
                Aucun evenement disponible
              </div>
            ) : (
              <select
                className="min-w-[220px] rounded-full border border-primary/20 bg-background/80 px-4 py-2 text-xs"
                value={selectedEvent?.id ?? ""}
                onChange={e => {
                  const value = Number(e.target.value);
                  const event = events.find(item => item.id === value);
                  if (!event) return;
                  setSelectedEvent(event);
                  setSelectedEventId(event.id);
                }}
              >
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            )}
            <Button
              type="button"
              variant="ghost"
              className="px-3 py-2 text-xs"
              onClick={() => setScanning(s => !s)}
              disabled={mode === "MANUAL"}
            >
              {scanning ? "Arreter" : "Activer la camera"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="px-3 py-2 text-xs"
              onClick={() => setFullscreen(f => !f)}
            >
              {fullscreen ? "Quitter plein ecran" : "Plein ecran"}
            </Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-primary/10 bg-background/70 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-text/60">Invites attendus</p>
            <p className="mt-1 text-lg font-semibold">{stats.totalGuests}</p>
          </div>
          <div className="rounded-2xl border border-green-200 bg-green-50 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-green-700">Deja presents</p>
            <p className="mt-1 text-lg font-semibold text-green-700">{stats.present}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-700">Restants</p>
            <p className="mt-1 text-lg font-semibold text-amber-700">{stats.remaining}</p>
          </div>
        </div>
      </section>

      <div className={fullscreen ? "grid gap-4" : "grid gap-4 lg:grid-cols-[1.2fr,1fr]"}>
        <section className={`card p-4 space-y-4 ${fullscreen ? "max-h-[calc(100vh-180px)] overflow-y-auto" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="title-4">Zone scanner</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-[11px] ${
                  mode === "SCAN" ? "bg-primary/10 text-text" : "text-text/60 hover:bg-primary/5"
                }`}
                onClick={() => setMode("SCAN")}
              >
                Mode scan
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-[11px] ${
                  mode === "MANUAL" ? "bg-primary/10 text-text" : "text-text/60 hover:bg-primary/5"
                }`}
                onClick={() => setMode("MANUAL")}
              >
                Mode manuel
              </button>
              <div className="flex items-center gap-1 rounded-full border border-primary/10 bg-background/70 px-1 py-1">
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 text-[11px] ${
                    direction === "IN" ? "bg-primary/10 text-text" : "text-text/60 hover:bg-primary/5"
                  }`}
                  onClick={() => setDirection("IN")}
                >
                  Entree
                </button>
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 text-[11px] ${
                    direction === "OUT" ? "bg-primary/10 text-text" : "text-text/60 hover:bg-primary/5"
                  }`}
                  onClick={() => setDirection("OUT")}
                >
                  Sortie
                </button>
              </div>
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-[11px] ${
                  rapidMode ? "bg-primary/10 text-text" : "text-text/60 hover:bg-primary/5"
                }`}
                onClick={() => setRapidMode(r => !r)}
              >
                Scan rapide {rapidMode ? "ON" : "OFF"}
              </button>
            </div>
          </div>

            <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-black">
              <div className="absolute inset-0 pointer-events-none">
                <div className="scan-line" />
              </div>
            <video ref={videoRef} className="h-[320px] w-full rounded-2xl object-cover" />
            </div>
          <p className="text-small text-text/70">Scannez le QR code de l'invite. Retour automatique au scanner.</p>

          {mode === "MANUAL" ? (
            <div className="space-y-3">
              <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-2 text-xs">
                <Input
                  placeholder="Coller un lien ou un token..."
                  value={manualToken}
                  onChange={e => setManualToken(e.target.value)}
                />
                <Button className="w-full md:w-auto">Valider</Button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-2">
                <Input
                  placeholder="Rechercher un invite (nom ou telephone)..."
                  value={manualQuery}
                  onChange={e => setManualQuery(e.target.value)}
                />
                <Button type="button" className="w-full md:w-auto" onClick={searchManual}>
                  Rechercher
                </Button>
              </div>

              {manualResults.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {manualResults.map(item => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-primary/10 bg-background/70 px-3 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.fullName}</span>
                        <span className={`rounded-full px-2 py-1 text-[10px] ${guestStatusClass(item.status)}`}>
                          {guestStatusLabel(item.status)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-text/70">
                        {item.phone ? <span>{item.phone}</span> : null}
                        {item.table?.label ? <span>Table: {item.table.label}</span> : null}
                        {item.invitation?.checkedInAt ? <span>Deja entre</span> : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="px-3 py-1 text-xs"
                          onClick={() => handleManualAction(item.invitation?.token, "IN")}
                        >
                          Entrer
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-3 py-1 text-xs"
                          onClick={() => handleManualAction(item.invitation?.token, "OUT")}
                        >
                          Sortir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className={`card p-4 space-y-4 ${fullscreen ? "max-h-[calc(100vh-180px)] overflow-y-auto" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="title-4">Resultat du scan</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                className="px-3 py-2 text-xs"
                onClick={syncOffline}
                disabled={offlineQueue.length === 0 || syncing}
              >
                {syncing ? "Synchronisation..." : `Synchroniser (${offlineQueue.length})`}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="px-3 py-2 text-xs"
                onClick={exportResultsPdf}
                disabled={results.length === 0}
              >
                Export PDF
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="px-3 py-2 text-xs"
                onClick={exportResultsCsv}
                disabled={results.length === 0}
              >
                Export CSV
              </Button>
            </div>
          </div>

          {currentResult ? (
            <div
              className={`rounded-2xl border px-4 py-3 ${
                currentResult.status === "ok"
                  ? currentResult.alreadyCheckedIn
                    ? "border-amber-200 bg-amber-50"
                    : "border-green-200 bg-green-50"
                  : currentResult.status === "offline"
                    ? "border-amber-200 bg-amber-50"
                    : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">
                  {currentResult.guestName ?? "Invite"}
                </p>
                <span className="text-xs font-medium">
                  {currentResult.status === "ok"
                    ? currentResult.action === "OUT"
                      ? currentResult.alreadyCheckedIn
                        ? "Sortie enregistree"
                        : "Non entre"
                      : currentResult.alreadyCheckedIn
                        ? "Deja enregistre"
                        : "Acces autorise"
                    : currentResult.status === "offline"
                      ? "Hors ligne"
                      : "Invitation invalide"}
                </span>
              </div>
              <p className="mt-1 text-small">{currentResult.message}</p>
              <div className="mt-2 grid grid-cols-1 gap-2 text-[11px] text-text/70">
                <div className="flex items-center justify-between">
                  <span>Table/Zone</span>
                  <span className="font-medium text-text">{currentResult.tableLabel ?? "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Statut</span>
                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] ${guestStatusClass(currentResult.guestStatus)}`}>
                    {guestStatusLabel(currentResult.guestStatus)}
                  </span>
                </div>
                {currentResult.checkedInAt ? (
                  <div className="flex items-center justify-between">
                    <span>Heure</span>
                    <span>{new Date(currentResult.checkedInAt).toLocaleString("fr-FR")}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-primary/10 bg-background/70 px-4 py-6 text-center text-small text-text/60">
              Scannez un QR code pour afficher le resultat ici.
            </div>
          )}

          <div className={`space-y-2 ${fullscreen ? "hidden" : ""}`}>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Historique</h4>
              <span className="text-[11px] text-text/60">{results.length} scan(s)</span>
            </div>
            {results.length === 0 ? (
              <EmptyState
                title="Aucun scan"
                description="Scannez un QR code ou collez un lien pour commencer."
              />
            ) : (
              <ul className="space-y-2 text-xs">
                {results.slice(0, 8).map(result => (
                  <li
                    key={result.token + result.message}
                    className="rounded-lg border border-primary/10 bg-white/70 px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {result.guestName || "Invite"}
                      </span>
                      <span
                        className={
                          result.status === "ok"
                            ? result.action === "OUT"
                              ? "text-amber-600"
                              : result.alreadyCheckedIn
                                ? "text-amber-600"
                                : "text-green-600"
                            : result.status === "offline"
                              ? "text-amber-600"
                              : "text-red-600"
                        }
                      >
                        {result.status === "ok"
                          ? result.action === "OUT"
                            ? result.alreadyCheckedIn
                              ? "Sortie"
                              : "Non entre"
                            : result.alreadyCheckedIn
                              ? "Deja enregistre"
                              : "Valide"
                          : result.status === "offline"
                            ? "Hors ligne"
                            : "Refuse"}
                      </span>
                    </div>
                    <p className="text-small">{result.message}</p>
                    <div className="mt-1 text-small flex flex-wrap gap-3">
                      {result.tableLabel ? <span>Table: {result.tableLabel}</span> : null}
                      {result.checkedInAt ? (
                        <span>Heure: {new Date(result.checkedInAt).toLocaleString("fr-FR")}</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {offlineQueue.length > 0 ? (
            <div className="rounded-xl border border-primary/10 bg-background/70 p-3 text-small">
              {offlineQueue.length} scan(s) en attente de synchronisation.
            </div>
          ) : null}
        </section>
      </div>

      <style jsx>{`
        .scan-line {
          position: absolute;
          left: 12%;
          right: 12%;
          height: 2px;
          background: rgba(212, 175, 55, 0.9);
          top: 10%;
          animation: scanMove 2.2s ease-in-out infinite;
        }

        @keyframes scanMove {
          0% {
            top: 12%;
            opacity: 0.4;
          }
          50% {
            top: 60%;
            opacity: 0.9;
          }
          100% {
            top: 12%;
            opacity: 0.4;
          }
        }
      `}</style>
    </main>
  );
}
