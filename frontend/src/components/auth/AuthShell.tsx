"use client";

import Link from "next/link";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  sideTitle: string;
  sideCopy: string;
  sideStats: Array<{ label: string; value: string }>;
  children: React.ReactNode;
  footer: React.ReactNode;
};

type Variant = "info" | "success" | "warning" | "error";

const VARIANT_META: Record<Variant, { shell: string; badge: string; title: string; accent: string; label: string }> = {
  info: {
    shell: "border-slate-200 bg-slate-50 text-slate-700",
    badge: "border-slate-200 bg-white text-slate-700",
    title: "text-slate-950",
    accent: "bg-slate-950",
    label: "Info"
  },
  success: {
    shell: "border-emerald-200 bg-emerald-50 text-emerald-900",
    badge: "border-emerald-200 bg-white text-emerald-800",
    title: "text-emerald-950",
    accent: "bg-emerald-600",
    label: "Succes"
  },
  warning: {
    shell: "border-amber-200 bg-amber-50 text-amber-900",
    badge: "border-amber-200 bg-white text-amber-900",
    title: "text-amber-950",
    accent: "bg-amber-500",
    label: "Attention"
  },
  error: {
    shell: "border-rose-200 bg-rose-50 text-rose-900",
    badge: "border-rose-200 bg-white text-rose-900",
    title: "text-rose-950",
    accent: "bg-rose-600",
    label: "Erreur"
  }
};

function ShellSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/6 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.14)] backdrop-blur-md">
      <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tracking-tight text-white">{value}</p>
    </div>
  );
}

function VariantBadge({ variant }: { variant: Variant }) {
  const meta = VARIANT_META[variant];
  return (
    <div className={`grid h-11 w-11 place-items-center rounded-2xl border ${meta.badge}`}>
      <span className="text-[11px] font-bold uppercase tracking-[0.22em]">{meta.label.slice(0, 1)}</span>
    </div>
  );
}

export function AuthShell({
  eyebrow,
  title,
  description,
  sideTitle,
  sideCopy,
  sideStats,
  children,
  footer
}: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#15213a_0%,_#0b1220_38%,_#090f1a_100%)] px-4 py-6 text-white md:px-6 md:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:36px_36px] opacity-30" />
      <div className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-20 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-[32px] border border-white/10 bg-white/5 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl xl:grid-cols-[1.02fr,0.98fr]">
        <section className="relative hidden overflow-hidden px-10 py-10 xl:flex xl:flex-col">
          <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(8,15,28,0.88)_0%,rgba(13,24,43,0.85)_50%,rgba(16,32,57,0.9)_100%)]" />
          <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.16),transparent_24%),radial-gradient(circle_at_80%_15%,rgba(255,255,255,0.08),transparent_16%),radial-gradient(circle_at_50%_82%,rgba(148,163,184,0.15),transparent_24%)]" />

          <div className="relative z-10 flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold tracking-[0.32em] text-white/95">
              EVENTIA
            </Link>
            <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[10px] uppercase tracking-[0.34em] text-white/60">
              Organizer suite
            </span>
          </div>

          <div className="relative z-10 mt-16 max-w-xl space-y-5">
            <p className="text-[11px] uppercase tracking-[0.42em] text-white/45">{eyebrow}</p>
            <h1 className="max-w-lg text-5xl font-semibold leading-[1.02] tracking-tight text-white">
              {sideTitle}
            </h1>
            <p className="max-w-xl text-[15px] leading-7 text-slate-300">{sideCopy}</p>
          </div>

          <div className="relative z-10 mt-12 grid gap-4">
            <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-md">
              <p className="text-[10px] uppercase tracking-[0.34em] text-white/45">Core experience</p>
              <div className="mt-4 grid gap-3 text-sm text-slate-200 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">Secure sign-in</div>
                <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">Google ready</div>
                <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">Dynamic feedback</div>
                <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">Admin dashboard</div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {sideStats.map(item => (
                <ShellSignal key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </div>
        </section>

        <section className="relative flex items-center justify-center bg-[linear-gradient(180deg,rgba(248,250,252,0.97)_0%,rgba(241,245,249,0.98)_100%)] px-4 py-8 text-slate-900 md:px-8 xl:px-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(15,23,42,0.05),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.04),transparent_20%)]" />
          <div className="relative w-full max-w-[560px]">
            <div className="mb-8 xl:hidden">
              <Link href="/" className="text-lg font-semibold tracking-[0.32em] text-slate-900">
                EVENTIA
              </Link>
            </div>

            <div className="mb-6 space-y-4">
              <p className="text-[11px] uppercase tracking-[0.42em] text-slate-500">{eyebrow}</p>
              <h2 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-[3.35rem]">
                {title}
              </h2>
              <p className="max-w-xl text-[15px] leading-7 text-slate-600">{description}</p>
            </div>

            <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:p-7">
              <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#0f172a,#64748b,#0f766e,#f59e0b)]" />
              {children}
            </div>

            <div className="mt-5 text-sm text-slate-600">{footer}</div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{label}</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

type AuthNoticeProps = {
  variant?: Variant;
  title?: string;
  message: React.ReactNode;
  action?: React.ReactNode;
};

export function AuthNotice({ variant = "info", title, message, action }: AuthNoticeProps) {
  const styles = VARIANT_META[variant];

  return (
    <div className={`rounded-[22px] border px-4 py-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)] ${styles.shell}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 h-3 w-3 rounded-full ${styles.accent}`} />
        <div className="min-w-0 flex-1">
          {title ? <p className={`text-sm font-semibold ${styles.title}`}>{title}</p> : null}
          <div className="mt-1 text-sm leading-6">{message}</div>
          {action ? <div className="mt-3 flex flex-wrap gap-2">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

type AuthActionBoxProps = {
  variant?: Variant;
  title: string;
  message: React.ReactNode;
  primaryLabel: string;
  onPrimaryClick?: () => void;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  onSecondaryClick?: () => void;
};

export function AuthActionBox({
  variant = "info",
  title,
  message,
  primaryLabel,
  onPrimaryClick,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  onSecondaryClick
}: AuthActionBoxProps) {
  const styles = VARIANT_META[variant];
  const buttonClass =
    "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4";

  return (
    <div className={`overflow-hidden rounded-[24px] border shadow-[0_18px_40px_rgba(15,23,42,0.06)] ${styles.shell}`}>
      <div className={`h-1 ${styles.accent}`} />
      <div className="flex items-start gap-4 px-4 py-4 sm:px-5">
        <VariantBadge variant={variant} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${styles.title}`}>{title}</p>
          <div className="mt-1 text-sm leading-6">{message}</div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {primaryHref ? (
              <a
                href={primaryHref}
                className={`${buttonClass} bg-slate-950 text-white hover:bg-slate-800 focus:ring-slate-300`}
              >
                {primaryLabel}
              </a>
            ) : (
              <button
                type="button"
                onClick={onPrimaryClick}
                className={`${buttonClass} bg-slate-950 text-white hover:bg-slate-800 focus:ring-slate-300`}
              >
                {primaryLabel}
              </button>
            )}
            {secondaryLabel ? (
              secondaryHref ? (
                <a
                  href={secondaryHref}
                  className={`${buttonClass} border border-white/60 bg-white/70 text-slate-900 hover:bg-white focus:ring-slate-200`}
                >
                  {secondaryLabel}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onSecondaryClick}
                  className={`${buttonClass} border border-white/60 bg-white/70 text-slate-900 hover:bg-white focus:ring-slate-200`}
                >
                  {secondaryLabel}
                </button>
              )
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

type AuthPopupProps = {
  open: boolean;
  variant?: Variant;
  title: string;
  message: React.ReactNode;
  primaryLabel: string;
  primaryHref?: string;
  onPrimaryClick?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  onSecondaryClick?: () => void;
  onClose: () => void;
};

export function AuthPopup({
  open,
  variant = "info",
  title,
  message,
  primaryLabel,
  primaryHref,
  onPrimaryClick,
  secondaryLabel,
  secondaryHref,
  onSecondaryClick,
  onClose
}: AuthPopupProps) {
  const styles = VARIANT_META[variant];
  const buttonClass =
    "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Fermer le popup"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-lg overflow-hidden rounded-[30px] border bg-white shadow-[0_30px_100px_rgba(15,23,42,0.28)] ${styles.shell} animate-[page-enter_220ms_ease-out]`}
      >
        <div className={`h-1 ${styles.accent}`} />
        <div className="flex items-start justify-between gap-4 px-5 py-5">
          <div className="flex items-start gap-3">
            <VariantBadge variant={variant} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className={`text-base font-semibold ${styles.title}`}>{title}</p>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] text-slate-500">
                  {styles.label}
                </span>
              </div>
              <div className="mt-1 text-sm leading-6 text-slate-700">{message}</div>
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
            {primaryHref ? (
              <a
                href={primaryHref}
                className={`${buttonClass} bg-slate-950 text-white hover:bg-slate-800 focus:ring-slate-300`}
              >
                {primaryLabel}
              </a>
            ) : (
              <button
                type="button"
                onClick={onPrimaryClick}
                className={`${buttonClass} bg-slate-950 text-white hover:bg-slate-800 focus:ring-slate-300`}
              >
                {primaryLabel}
              </button>
            )}

            {secondaryLabel ? (
              secondaryHref ? (
                <a
                  href={secondaryHref}
                  className={`${buttonClass} border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 focus:ring-slate-200`}
                >
                  {secondaryLabel}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onSecondaryClick}
                  className={`${buttonClass} border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 focus:ring-slate-200`}
                >
                  {secondaryLabel}
                </button>
              )
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function GoogleButton({
  href,
  disabled,
  label
}: {
  href: string;
  disabled?: boolean;
  label: string;
}) {
  const commonClassName =
    "flex w-full items-center justify-center gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50";

  const content = (
    <>
      <span className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.4l2.6-2.5C16.8 3.4 14.7 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c6.9 0 9.1-4.8 9.1-7.2 0-.5 0-.8-.1-1.1H12Z"
          />
          <path
            fill="#34A853"
            d="M2.5 12c0 1.9.7 3.7 1.9 5.1l3.1-2.4c-.4-.8-.7-1.7-.7-2.7s.2-1.9.7-2.7L4.4 6.9A9.4 9.4 0 0 0 2.5 12Z"
          />
          <path
            fill="#FBBC05"
            d="M12 21.5c2.7 0 4.9-.9 6.5-2.5l-3-2.4c-.8.5-1.9.9-3.5.9-2.6 0-4.8-1.7-5.6-4l-3.2 2.4c1.7 3.4 5.2 5.6 8.8 5.6Z"
          />
          <path
            fill="#4285F4"
            d="M21.1 13.2c.1-.3.1-.6.1-1.1s0-.8-.1-1.1H12v3.9h5.5c-.3 1.4-1.1 2.5-2.1 3.2l3 2.4c1.8-1.7 2.7-4.2 2.7-7.3Z"
          />
        </svg>
      </span>
      <span>{label}</span>
    </>
  );

  if (disabled) {
    return (
      <button type="button" className={`${commonClassName} cursor-not-allowed opacity-65`} disabled>
        {content}
      </button>
    );
  }

  return (
    <a href={href} className={commonClassName}>
      {content}
    </a>
  );
}
