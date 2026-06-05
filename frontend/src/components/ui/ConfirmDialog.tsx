"use client";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

const VARIANT_STYLES: Record<
  NonNullable<ConfirmDialogProps["variant"]>,
  {
    shell: string;
    badge: string;
    confirm: string;
  }
> = {
  danger: {
    shell: "border-rose-200 bg-rose-50 text-rose-950",
    badge: "border-rose-200 bg-white text-rose-700",
    confirm: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-200"
  },
  warning: {
    shell: "border-amber-200 bg-amber-50 text-amber-950",
    badge: "border-amber-200 bg-white text-amber-700",
    confirm: "bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-200"
  },
  info: {
    shell: "border-slate-200 bg-white text-slate-950",
    badge: "border-slate-200 bg-white text-slate-700",
    confirm: "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-300"
  }
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "danger",
  loading = false,
  onConfirm,
  onClose
}: ConfirmDialogProps) {
  if (!open) return null;

  const styles = VARIANT_STYLES[variant];
  const buttonClass =
    "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Fermer la confirmation"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className={`relative w-full max-w-lg overflow-hidden rounded-[28px] border shadow-[0_28px_90px_rgba(15,23,42,0.22)] ${styles.shell}`}>
        <div className="flex items-start justify-between gap-4 px-5 py-5">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 grid h-11 w-11 place-items-center rounded-2xl border ${styles.badge}`}>
              <span className="text-sm font-bold uppercase tracking-[0.18em]">!</span>
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-slate-950">{title}</p>
              <div className="mt-1 text-sm leading-6 text-slate-700">{description}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Fermer
          </button>
        </div>

        <div className="border-t border-slate-200/70 px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className={`${buttonClass} border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 focus:ring-slate-200`}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`${buttonClass} ${styles.confirm} ${loading ? "cursor-not-allowed opacity-70" : ""}`}
            >
              {loading ? "Traitement..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
