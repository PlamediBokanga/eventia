"use client";

import Link from "next/link";
import Image from "next/image";

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
    <main className="min-h-screen bg-[#f4f1ec] text-slate-900 lg:p-5">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] bg-white shadow-sm lg:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[0.92fr_1.08fr] lg:overflow-visible lg:rounded-[28px] lg:shadow-[0_28px_90px_rgba(37,31,23,0.14)]">
        <section className="relative isolate h-[220px] overflow-hidden sm:h-[260px] lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)] lg:rounded-l-[28px]">
          <Image
            src="/images/auth/eventia-auth.jpg"
            alt="Table de réception décorée de fleurs pour un événement"
            fill
            priority
            sizes="(min-width: 1024px) 46vw, 100vw"
            className="-z-20 object-cover object-center"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/45 via-slate-950/15 to-slate-950/80 lg:bg-gradient-to-t lg:from-slate-950/85 lg:via-slate-950/20 lg:to-slate-950/10" />

          <div className="relative flex h-full flex-col justify-between p-5 text-white sm:p-7 lg:p-10">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="text-lg font-semibold tracking-[0.28em] text-white drop-shadow-sm">EVENTIA</Link>
              <span className="rounded-full border border-white/35 bg-slate-950/20 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white backdrop-blur-sm">Événements, avec soin</span>
            </div>

            <div className="max-w-xl space-y-3 lg:space-y-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/80 lg:text-xs">{eyebrow}</p>
              <h1 className="max-w-lg text-2xl font-semibold leading-tight tracking-tight text-white drop-shadow-sm sm:text-3xl lg:text-5xl">{sideTitle}</h1>
              <p className="hidden max-w-lg text-sm leading-6 text-white/90 sm:block lg:text-base lg:leading-7">{sideCopy}</p>
              <div className="hidden flex-wrap gap-2 pt-1 sm:flex">
                {sideStats.slice(0, 2).map(item => (
                  <span key={item.label} className="rounded-full border border-white/25 bg-slate-950/25 px-3 py-2 text-xs text-white/90 backdrop-blur-sm">
                    <strong className="mr-1.5 text-white">{item.value}</strong>{item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-w-0 justify-center bg-white px-5 py-8 sm:px-8 sm:py-10 lg:items-center lg:px-10 lg:py-12 xl:px-16">
          <div className="w-full max-w-[560px]">
            <div className="mb-7 space-y-3 sm:mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6b45]">{eyebrow}</p>
              <h2 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
              <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">{description}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_36px_rgba(15,23,42,0.055)] sm:rounded-3xl sm:p-7">
              {children}
            </div>

            <div className="mt-6 text-center text-sm text-slate-600 sm:text-left">{footer}</div>
            <p className="mt-7 text-center text-[11px] text-slate-400">EVENTIA · Espace organisateur sécurisé</p>
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
  const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none";

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
                className={`${buttonClass} site-button-primary`}
              >
                {primaryLabel}
              </a>
            ) : (
              <button
                type="button"
                onClick={onPrimaryClick}
                className={`${buttonClass} site-button-primary`}
              >
                {primaryLabel}
              </button>
            )}
            {secondaryLabel ? (
              secondaryHref ? (
                <a
                  href={secondaryHref}
                  className={`${buttonClass} site-button-secondary`}
                >
                  {secondaryLabel}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onSecondaryClick}
                  className={`${buttonClass} site-button-secondary`}
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
  const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none";

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
            className="site-button-secondary min-h-11 rounded-full px-4 text-xs"
          >
            Fermer
          </button>
        </div>

        <div className="border-t border-slate-200/70 px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            {primaryHref ? (
              <a
                href={primaryHref}
                className={`${buttonClass} site-button-primary`}
              >
                {primaryLabel}
              </a>
            ) : (
              <button
                type="button"
                onClick={onPrimaryClick}
                className={`${buttonClass} site-button-primary`}
              >
                {primaryLabel}
              </button>
            )}

            {secondaryLabel ? (
              secondaryHref ? (
                <a
                  href={secondaryHref}
                  className={`${buttonClass} site-button-secondary`}
                >
                  {secondaryLabel}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onSecondaryClick}
                  className={`${buttonClass} site-button-secondary`}
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
    "site-button-secondary min-h-12 w-full rounded-[18px] font-medium";

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

export function FacebookButton({
  href,
  disabled,
  label
}: {
  href: string;
  disabled?: boolean;
  label: string;
}) {
  const commonClassName =
    "site-button-secondary min-h-12 w-full rounded-[18px] font-medium";

  const content = (
    <>
      <span className="grid h-8 w-8 place-items-center rounded-full bg-[#1877F2] text-white">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
          <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.7c0-.9.2-1.6 1.7-1.6h1.5V4.2c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.8H8v3.1h2.5v8h3Z" />
        </svg>
      </span>
      <span>{label}</span>
    </>
  );

  if (disabled) {
    return (
      <button type="button" className={commonClassName + " cursor-not-allowed opacity-65"} disabled>
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
