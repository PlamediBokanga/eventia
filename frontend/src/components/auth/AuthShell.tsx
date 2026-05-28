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
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(188,221,255,0.65),_transparent_28%),linear-gradient(135deg,_#f7f4ec_0%,_#e7efe9_48%,_#d7e5f4_100%)] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[32px] border border-white/60 bg-white/70 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur xl:grid-cols-[1.06fr,0.94fr]">
        <section className="relative hidden overflow-hidden bg-[linear-gradient(160deg,_rgba(10,37,64,0.98)_0%,_rgba(16,83,127,0.94)_48%,_rgba(42,122,126,0.92)_100%)] px-10 py-12 text-white xl:flex xl:flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,_rgba(255,255,255,0.16),_transparent_24%),radial-gradient(circle_at_85%_18%,_rgba(255,220,150,0.2),_transparent_18%),radial-gradient(circle_at_55%_72%,_rgba(105,210,231,0.18),_transparent_25%)]" />
          <div className="relative z-10 flex items-center justify-between">
            <Link href="/" className="font-heading text-lg tracking-[0.24em] text-white/90">
              EVENTIA
            </Link>
            <span className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/70">
              Suite organisateur
            </span>
          </div>

          <div className="relative z-10 mt-20 max-w-xl space-y-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-white/60">{eyebrow}</p>
            <h1 className="font-heading text-5xl leading-[1.02] text-white">{sideTitle}</h1>
            <p className="max-w-lg text-base leading-7 text-white/78">{sideCopy}</p>
          </div>

          <div className="relative z-10 mt-auto grid gap-4 md:grid-cols-3">
            {sideStats.map(item => (
              <div
                key={item.label}
                className="rounded-3xl border border-white/14 bg-white/8 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              >
                <p className="text-3xl font-semibold text-white">{item.value}</p>
                <p className="mt-2 text-sm leading-6 text-white/65">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 md:px-8 xl:px-12">
          <div className="w-full max-w-xl">
            <div className="mb-8 xl:hidden">
              <Link href="/" className="font-heading text-lg tracking-[0.22em] text-text">
                EVENTIA
              </Link>
            </div>

            <div className="mb-8 space-y-3">
              <p className="text-[11px] uppercase tracking-[0.28em] text-primary/55">{eyebrow}</p>
              <h2 className="font-heading text-4xl leading-tight text-text md:text-5xl">{title}</h2>
              <p className="max-w-lg text-sm leading-7 text-text/68 md:text-base">{description}</p>
            </div>

            <div className="rounded-[28px] border border-primary/10 bg-white/88 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:p-7">
              {children}
            </div>

            <div className="mt-5 text-sm text-text/68">{footer}</div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-primary/10" />
      <span className="text-[11px] uppercase tracking-[0.24em] text-text/45">{label}</span>
      <div className="h-px flex-1 bg-primary/10" />
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
    "flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm";

  const content = (
    <>
      <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-50">
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
