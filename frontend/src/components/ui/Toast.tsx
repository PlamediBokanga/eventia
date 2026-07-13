"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastType = "success" | "error";

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  pushToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function ToastIcon({ type }: { type: ToastType }) {
  if (type === "success") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m20 6-11 11-5-5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const pushToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(prev => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3400);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed left-1/2 top-4 z-[60] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-3"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map(toast => {
          const tone =
            toast.type === "success"
              ? "border-emerald-400/25 bg-slate-950/92 text-white shadow-[0_20px_50px_rgba(6,95,70,0.25)]"
              : "border-rose-400/25 bg-slate-950/92 text-white shadow-[0_20px_50px_rgba(127,29,29,0.25)]";

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto overflow-hidden rounded-[20px] border backdrop-blur-xl ${tone}`}
            >
              <div className={`h-1 ${toast.type === "success" ? "bg-emerald-400" : "bg-rose-400"}`} />
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-white/6">
                  <ToastIcon type={toast.type} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/50">
                    {toast.type === "success" ? "Succes" : "Erreur"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-white/92">{toast.message}</p>
                </div>
                <button
                  type="button"
                  aria-label="Fermer"
                  onClick={() => dismissToast(toast.id)}
                  className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  Fermer
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return ctx;
}
