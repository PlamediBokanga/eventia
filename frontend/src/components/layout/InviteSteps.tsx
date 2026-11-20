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
    <nav aria-label="Navigation de votre invitation" className="sticky top-0 z-30 -mx-3 px-3 pb-2 pt-2 sm:top-2 sm:mx-0 sm:px-0">
      <div className="mb-1.5 flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
        <span>Votre espace invitation</span>
        <span>Étape {activeIndex + 1} sur {steps.length}</span>
      </div>
      <div className="rounded-2xl border border-white/80 bg-white/90 p-1.5 shadow-md shadow-[#526b5c]/10 backdrop-blur-xl sm:rounded-3xl sm:p-2">
        <div className="flex min-w-max gap-1.5 overflow-x-auto sm:grid sm:min-w-0 sm:grid-cols-5 sm:gap-2">
          {steps.map(step => {
            const active = step.key === current;
            return (
              <Link
                key={step.key}
                href={step.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 min-w-[104px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#526b5c] focus-visible:ring-offset-2 sm:min-w-0 sm:rounded-2xl sm:px-2 ${
                  active
                    ? "bg-[#526b5c] text-white font-semibold shadow-sm shadow-[#526b5c]/20"
                    : "border border-slate-200/80 bg-white text-slate-700 hover:border-[#9aafa0] hover:bg-[#f3f6f3]"
                }`}
              >
                <span aria-hidden="true" className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px] font-bold ${active ? "bg-white/15 text-white" : "bg-[#edf2ee] text-[#526b5c]"}`}>
                  {step.short}
                </span>
                <span className="text-[11px] font-semibold leading-tight">{step.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
