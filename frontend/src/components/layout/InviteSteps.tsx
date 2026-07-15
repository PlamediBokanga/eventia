import Link from "next/link";

type Step = "landing" | "invitation" | "drinks" | "guestbook" | "chat";

export function InviteSteps({ token, current }: { token: string; current: Step }) {
  const steps: Array<{ key: Step; label: string; href: string }> = [
    { key: "landing", label: "Accueil", href: `/invite/${token}` },
    { key: "invitation", label: "Invitation", href: `/invite/${token}/invitation` },
    { key: "drinks", label: "Boissons", href: `/invite/${token}/drinks` },
    { key: "guestbook", label: "Livre d'or", href: `/invite/${token}/guestbook` },
    { key: "chat", label: "Chat", href: `/invite/${token}/chat` }
  ];

  return (
    <div className="sticky top-2 z-30 -mx-1 overflow-x-auto px-1 pb-1 text-[11px]">
      <div className="mb-2 flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
        <span>Parcours invit?</span>
        <span>{steps.findIndex(step => step.key === current) + 1}/{steps.length}</span>
      </div>
      <div className="grid min-w-max grid-flow-col grid-cols-5 gap-2 rounded-[24px] border border-white/50 bg-white/70 p-2 shadow-lg shadow-slate-200/40 backdrop-blur-md">
        {steps.map((step, index) => {
          const active = step.key === current;
          return (
            <Link
              key={step.key}
              href={step.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-[18px] px-3 py-2 text-center transition ${active ? "bg-slate-950 text-white font-medium shadow-lg shadow-slate-950/15 ring-1 ring-slate-950/10" : "bg-white/90 text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
            >
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">{index + 1}</div>
              <div className="mt-1 text-[11px] font-semibold">{step.label}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
