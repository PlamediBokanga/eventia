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
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
      {steps.map(step => {
        const active = step.key === current;
        return (
          <Link
            key={step.key}
            href={step.href}
            className={`rounded-lg px-2 py-1 text-center transition ${
              active
                ? "bg-primary text-white font-medium"
                : "bg-background/70 text-textSecondary hover:bg-background/90"
            }`}
          >
            {step.label}
          </Link>
        );
      })}
    </div>
  );
}
