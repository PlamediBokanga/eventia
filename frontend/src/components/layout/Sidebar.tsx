"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU_SECTIONS = [
  {
    title: "Dashboard",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "home" }]
  },
  {
    title: "Gestion evenement",
    items: [
      { href: "/dashboard/events", label: "Evenements", icon: "calendar" },
      { href: "/dashboard/guests", label: "Invites", icon: "users" },
      { href: "/dashboard/tables", label: "Tables", icon: "grid" }
    ]
  },
  {
    title: "Experience invites",
    items: [
      { href: "/dashboard/invitations", label: "Invitations", icon: "mail" },
      { href: "/dashboard/scanner", label: "Scanner QR", icon: "qr" },
      { href: "/dashboard/drinks", label: "Boissons", icon: "glass" },
      { href: "/dashboard/guestbook", label: "Livre d'or", icon: "book" },
      { href: "/dashboard/memories", label: "Souvenirs", icon: "camera" }
    ]
  },
  {
    title: "Communication",
    items: [
      { href: "/dashboard/chat", label: "Chat", icon: "chat" },
      { href: "/dashboard/notifications", label: "Notifications", icon: "bell" }
    ]
  },
  {
    title: "Analyse",
    items: [{ href: "/dashboard/stats", label: "Statistiques", icon: "chart" }]
  },
  {
    title: "Parametres",
    items: [
      { href: "/dashboard/settings", label: "Profil & Parametres", icon: "user" }
    ]
  }
];

function NavIcon({ type }: { type: string }) {
  if (type === "calendar") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </svg>
    );
  }
  if (type === "users") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="3" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a3 3 0 0 1 0 5.75" />
      </svg>
    );
  }
  if (type === "grid") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }
  if (type === "glass") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 3h12l-1 8a5 5 0 0 1-5 4 5 5 0 0 1-5-4z" />
        <path d="M12 15v6M9 21h6" />
      </svg>
    );
  }
  if (type === "settings") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-.4-1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.13 3.5l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 .4 1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1 .4H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1 .4 1.7 1.7 0 0 0-.6 1z" />
      </svg>
    );
  }
  if (type === "camera") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 7h4l2-2h4l2 2h4v12H4z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    );
  }
  if (type === "chat") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3z" />
      </svg>
    );
  }
  if (type === "book") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 5a3 3 0 0 1 3-3h11v19H7a3 3 0 0 1-3-3z" />
        <path d="M7 2v19" />
      </svg>
    );
  }
  if (type === "qr") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 14h4v4h-4zM18 18h3" />
      </svg>
    );
  }
  if (type === "gift") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="8" width="18" height="13" rx="2" />
        <path d="M12 8v13M3 12h18" />
        <path d="M7.5 8a2.5 2.5 0 1 1 0-5c2.5 0 4.5 2.5 4.5 5" />
        <path d="M16.5 8a2.5 2.5 0 1 0 0-5c-2.5 0-4.5 2.5-4.5 5" />
      </svg>
    );
  }
  if (type === "mail") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    );
  }
  if (type === "bell") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 18h12" />
        <path d="M12 6a4 4 0 0 1 4 4v3l1.5 2H6.5L8 13v-3a4 4 0 0 1 4-4z" />
        <path d="M10 18a2 2 0 0 0 4 0" />
      </svg>
    );
  }
  if (type === "chart") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" />
        <path d="M7 14v4M12 10v8M17 6v12" />
      </svg>
    );
  }
  if (type === "user") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    );
  }
  if (type === "shield") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10.5 12 3l9 7.5V21H3z" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}

export function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  const navClass = mobile
    ? "grid grid-cols-2 gap-2 text-xs"
    : "space-y-5 text-sm";

  const wrapperClass = mobile
    ? "bg-primary text-white rounded-2xl p-3"
    : "w-64 bg-primary text-white min-h-screen p-6";

  return (
    <aside className={wrapperClass}>
      <nav className={navClass}>
        {MENU_SECTIONS.map(section => (
          <div key={section.title} className={mobile ? "space-y-2" : "space-y-2"}>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">
              {section.title}
            </p>
            <div className={mobile ? "grid grid-cols-2 gap-2" : "space-y-1"}>
              {section.items.map(item => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname?.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 transition ${
                      active
                        ? "bg-white text-primary font-semibold shadow-sm"
                        : "text-white/90 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-white/80">
                      <NavIcon type={item.icon} />
                    </span>
                    <span className="whitespace-nowrap">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
