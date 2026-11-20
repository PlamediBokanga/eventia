"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

type ToastAction = {
  label: string;
  onClick: () => void;
};

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
  title?: string;
  duration: number;
  action?: ToastAction;
};

type ToastOptions = {
  title?: string;
  duration?: number;
  action?: ToastAction;
};

type ToastContextValue = {
  pushToast: (message: string, type?: ToastType, options?: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_META: Record<ToastType, { title: string; icon: string; colors: string }> = {
  success: {
    title: "C’est fait",
    icon: "M5 12.5 9.2 17 19 7",
    colors: "border-emerald-200 bg-white text-slate-900"
  },
  error: {
    title: "Une erreur est survenue",
    icon: "M12 8v4m0 4h.01M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3l-7.6-13.1a2 2 0 0 0-3.4 0Z",
    colors: "border-rose-200 bg-white text-slate-900"
  },
  warning: {
    title: "À vérifier",
    icon: "M12 9v4m0 4h.01M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3l-7.6-13.1a2 2 0 0 0-3.4 0Z",
    colors: "border-amber-200 bg-white text-slate-900"
  },
  info: {
    title: "Information",
    icon: "M12 16v-4m0-4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
    colors: "border-sky-200 bg-white text-slate-900"
  }
};

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 4200,
  error: 7000,
  warning: 6000,
  info: 5000
};

function ToastIcon({ type }: { type: ToastType }) {
  const iconColor: Record<ToastType, string> = {
    success: "text-emerald-700",
    error: "text-rose-700",
    warning: "text-amber-700",
    info: "text-sky-700"
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-5 w-5 ${iconColor[type]}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={TOAST_META[type].icon} />
    </svg>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const remainingRef = useRef(toast.duration);
  const meta = TOAST_META[toast.type];

  const startTimer = useCallback(() => {
    if (remainingRef.current <= 0) return;
    startedAtRef.current = Date.now();
    timeoutRef.current = window.setTimeout(() => onDismiss(toast.id), remainingRef.current);
  }, [onDismiss, toast.id]);

  const pauseTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current));
    }
    setPaused(true);
  }, []);

  const resumeTimer = useCallback(() => setPaused(false), []);

  useEffect(() => {
    if (paused || toast.duration <= 0) return;
    startTimer();
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, [paused, startTimer, toast.duration]);

  return (
    <article
      role={toast.type === "error" ? "alert" : "status"}
      aria-live={toast.type === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      className={`toast-card pointer-events-auto relative overflow-hidden rounded-2xl border p-4 shadow-[0_18px_55px_rgba(15,23,42,0.14)] animate-[toast-in_220ms_ease-out] ${meta.colors}`}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      onFocus={pauseTimer}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) resumeTimer();
      }}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 ring-1 ring-slate-200/80">
          <ToastIcon type={toast.type} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold leading-5 text-slate-950">{toast.title || meta.title}</p>
          <p className="mt-1 break-words text-sm leading-5 text-slate-700">{toast.message}</p>
          {toast.action ? (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onDismiss(toast.id);
              }}
              className="mt-3 min-h-9 rounded-lg px-3 text-sm font-semibold text-[#43584b] underline decoration-[#9caf9f] underline-offset-4 hover:bg-[#edf2ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#526b5c] focus-visible:ring-offset-2"
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Fermer la notification"
          onClick={() => onDismiss(toast.id)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#526b5c]"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="m5 5 10 10M15 5 5 15" />
          </svg>
        </button>
      </div>
      {toast.duration > 0 ? (
        <span
          aria-hidden="true"
          className={`toast-progress absolute inset-x-0 bottom-0 h-0.5 ${toast.type === "error" ? "bg-rose-500" : toast.type === "warning" ? "bg-amber-500" : toast.type === "info" ? "bg-sky-500" : "bg-emerald-500"}`}
          style={{ animationDuration: `${toast.duration}ms`, animationPlayState: paused ? "paused" : "running" }}
        />
      ) : null}
    </article>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const pushToast = useCallback((message: string, type: ToastType = "success", options: ToastOptions = {}) => {
    const id = ++nextId.current;
    const duration = Math.max(0, options.duration ?? DEFAULT_DURATION[type]);
    setToasts(prev => [...prev.slice(-2), { id, message, type, duration, title: options.title, action: options.action }]);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[100] mx-auto flex w-auto max-w-md flex-col gap-2.5 sm:left-auto sm:right-5 sm:top-5 sm:mx-0 sm:w-[min(92vw,420px)]">
        {toasts.map(toast => <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />)}
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
