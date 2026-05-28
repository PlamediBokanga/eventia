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
    <main className="relative min-h-screen overflow-hidden bg-[#f4f5f7] px-4 py-6 md:px-6 md:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:34px_34px] opacity-40" />
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_80px_rgba(15,23,42,0.08)] xl:grid-cols-[1.08fr,0.92fr]">
        <section className="relative hidden overflow-hidden bg-[linear-gradient(165deg,_#0f172a_0%,_#111c2d_40%,_#15293e_100%)] px-10 py-10 text-white xl:flex xl:flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_24%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.05),transparent_18%),radial-gradient(circle_at_50%_80%,rgba(148,163,184,0.08),transparent_26%)]" />
          <div className="relative z-10 flex items-center justify-between">
            <Link href="/" className="font-heading text-lg tracking-[0.28em] text-white/90">
              EVENTIA
            </Link>
            <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/65">
              Organisateur
            </span>
          </div>

          <div className="relative z-10 mt-20 max-w-xl space-y-5">
            <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">{eyebrow}</p>
            <h1 className="font-heading text-5xl leading-[1.02] text-white">{sideTitle}</h1>
            <p className="max-w-lg text-[15px] leading-7 text-slate-300">{sideCopy}</p>
          </div>

          <div className="relative z-10 mt-12 grid gap-3">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">Ce que vos utilisateurs voient</p>
              <div className="mt-4 grid gap-3 text-sm text-slate-200 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                  Parcours clair
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                  Sessions securisees
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                  Google Sign-In
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                  Redirection propre
                </div>
              </div>
            </div>

            {sideStats.map(item => (
              <div
                key={item.label}
                className="rounded-[22px] border border-white/10 bg-white/5 p-5"
              >
                <p className="text-[22px] font-semibold tracking-tight text-white">{item.value}</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center bg-[#fbfbfc] px-4 py-8 md:px-8 xl:px-12">
          <div className="w-full max-w-[560px]">
            <div className="mb-8 xl:hidden">
              <Link href="/" className="font-heading text-lg tracking-[0.28em] text-slate-900">
                EVENTIA
              </Link>
            </div>

            <div className="mb-8 space-y-4">
              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">{eyebrow}</p>
              <h2 className="font-heading text-4xl leading-tight text-slate-900 md:text-[3.35rem]">{title}</h2>
              <p className="max-w-xl text-[15px] leading-7 text-slate-600">{description}</p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_16px_35px_rgba(15,23,42,0.05)] md:p-7">
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
      <span className="text-[11px] uppercase tracking-[0.26em] text-slate-500">{label}</span>
      <div className="h-px flex-1 bg-slate-200" />
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
