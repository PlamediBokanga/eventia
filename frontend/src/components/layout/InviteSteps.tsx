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
      <div className="grid min-w-max grid-flow-col grid-cols-5 gap-2">
        {steps.map(step => {
          const active = step.key === current;
          return (
            <Link
              key={step.key}
              href={step.href}
              className={`rounded-full px-3 py-2 text-center transition ${
                active
                  ? "bg-slate-950 text-white font-medium shadow-lg shadow-slate-950/15"
                  : "bg-white/85 text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {step.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}