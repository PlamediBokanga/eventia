import Link from "next/link";

type Step = "landing" | "invitation" | "drinks" | "guestbook" | "chat";

export function InviteSteps({ token, current }: { token: string; current: Step }) {
  const steps: Array<{ key: Step; label: string; href: string; short: string }> = [
    { key: "landing", label: "Accueil", short: "01", href: `/invite/${token}` },
    { key: "invitation", label: "Invitation", short: "02", href: `/invite/${token}/invitation` },
    { key: "drinks", label: "Boissons", short: "03", href: `/invite/${token}/drinks` },
    { key: "guestbook", label: "Livre d'or", short: "04", href: `/invite/${token}/guestbook` },
    { key: "chat", label: "Chat", short: "05", href: `/invite/${token}/chat` }
  ];

  const activeIndex = Math.max(0, steps.findIndex(step => step.key === current));

  return (
    <div className="sticky top-2 z-30 -mx-1 overflow-x-auto px-1 pb-1 text-[11px]">
      <div className="mb-2 flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
        <span>Parcours invite</span>
        <span>{activeIndex + 1}/{steps.length}</span>
      </div>
      <div className="rounded-[24px] border border-white/60 bg-white/78 p-2 shadow-lg shadow-slate-200/40 backdrop-blur-md">
        <div className="grid min-w-max grid-flow-col grid-cols-5 gap-2">
          {steps.map((step, index) => {
            const active = step.key === current;
            const done = index < activeIndex;
            return (
              <Link
                key={step.key}
                href={step.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-[18px] px-3 py-2 text-center transition ${
                  active
                    ? "bg-slate-950 text-white font-medium shadow-lg shadow-slate-950/15 ring-1 ring-slate-950/10"
                    : done
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "bg-white/95 text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">{step.short}</div>
                <div className="mt-1 text-[11px] font-semibold">{step.label}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}