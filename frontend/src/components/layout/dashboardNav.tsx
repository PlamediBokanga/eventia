"use client";

export type DashboardRole = "user" | "organizer" | "agency" | "company" | "superadmin";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  roles?: DashboardRole[];
};

export type NavSection = {
  title: string;
  items: NavItem[];
  roles?: DashboardRole[];
};

export const ROLE_META: Record<DashboardRole, { label: string; description: string }> = {
  user: {
    label: "Compte standard",
    description: "Acces general"
  },
  organizer: {
    label: "Organisateur",
    description: "Pilotage d'evenements"
  },
  agency: {
    label: "Agence",
    description: "Multi-clients et collaboration"
  },
  company: {
    label: "Entreprise",
    description: "Evenements corporate"
  },
  superadmin: {
    label: "Super admin",
    description: "Gouvernance plateforme"
  }
};

const ALL_DASHBOARD_ROLES: DashboardRole[] = ["user", "organizer", "agency", "company", "superadmin"];
const BUSINESS_ROLES: DashboardRole[] = ["agency", "company", "superadmin"];
const ADMIN_ROLES: DashboardRole[] = ["superadmin"];

export const MENU_SECTIONS: NavSection[] = [
  {
    title: "Dashboard",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "home", roles: ALL_DASHBOARD_ROLES }]
  },
  {
    title: "Gestion evenement",
    items: [
      { href: "/dashboard/events", label: "Evenements", icon: "calendar", roles: ALL_DASHBOARD_ROLES },
      { href: "/dashboard/guests", label: "Invites", icon: "users", roles: ALL_DASHBOARD_ROLES },
      { href: "/dashboard/tables", label: "Tables", icon: "grid", roles: ALL_DASHBOARD_ROLES }
    ]
  },
  {
    title: "Experience invites",
    items: [
      { href: "/dashboard/invitations", label: "Invitations", icon: "mail", roles: ALL_DASHBOARD_ROLES },
      { href: "/dashboard/scanner", label: "Scanner QR", icon: "qr", roles: ALL_DASHBOARD_ROLES },
      { href: "/dashboard/drinks", label: "Boissons", icon: "glass", roles: ALL_DASHBOARD_ROLES },
      { href: "/dashboard/guestbook", label: "Livre d'or", icon: "book", roles: ALL_DASHBOARD_ROLES },
      { href: "/dashboard/memories", label: "Souvenirs", icon: "camera", roles: ALL_DASHBOARD_ROLES }
    ]
  },
  {
    title: "Communication",
    items: [
      { href: "/dashboard/chat", label: "Chat", icon: "chat", roles: ALL_DASHBOARD_ROLES },
      { href: "/dashboard/notifications", label: "Notifications", icon: "bell", roles: ALL_DASHBOARD_ROLES }
    ]
  },
  {
    title: "Analyse",
    items: [{ href: "/dashboard/stats", label: "Statistiques", icon: "chart", roles: ALL_DASHBOARD_ROLES }]
  },
  {
    title: "Business",
    roles: BUSINESS_ROLES,
    items: [
      { href: "/dashboard/billing", label: "Facturation", icon: "wallet", roles: BUSINESS_ROLES },
      { href: "/dashboard/gifts", label: "Cadeaux", icon: "gift", roles: BUSINESS_ROLES }
    ]
  },
  {
    title: "Parametres",
    items: [
      { href: "/dashboard/profile", label: "Profil", icon: "user", roles: ALL_DASHBOARD_ROLES },
      { href: "/dashboard/settings", label: "Parametres", icon: "settings", roles: ALL_DASHBOARD_ROLES },
      { href: "/dashboard/security", label: "Securite", icon: "shield", roles: ALL_DASHBOARD_ROLES }
    ]
  },
  {
    title: "Administration",
    roles: ADMIN_ROLES,
    items: [{ href: "/dashboard/admin", label: "Super Admin", icon: "shield", roles: ADMIN_ROLES }]
  }
];

function iconStroke(type: string) {
  switch (type) {
    case "calendar":
      return (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </>
      );
    case "users":
      return (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="3" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a3 3 0 0 1 0 5.75" />
        </>
      );
    case "grid":
      return (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </>
      );
    case "glass":
      return (
        <>
          <path d="M6 3h12l-1 8a5 5 0 0 1-5 4 5 5 0 0 1-5-4z" />
          <path d="M12 15v6M9 21h6" />
        </>
      );
    case "settings":
      return (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-.4-1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.13 3.5l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 .4 1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1 .4H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1 .4 1.7 1.7 0 0 0-.6 1z" />
        </>
      );
    case "camera":
      return (
        <>
          <path d="M4 7h4l2-2h4l2 2h4v12H4z" />
          <circle cx="12" cy="13" r="4" />
        </>
      );
    case "chat":
      return <path d="M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3z" />;
    case "book":
      return (
        <>
          <path d="M4 5a3 3 0 0 1 3-3h11v19H7a3 3 0 0 1-3-3z" />
          <path d="M7 2v19" />
        </>
      );
    case "qr":
      return (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h4v4h-4zM18 18h3" />
        </>
      );
    case "mail":
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </>
      );
    case "bell":
      return (
        <>
          <path d="M6 18h12" />
          <path d="M12 6a4 4 0 0 1 4 4v3l1.5 2H6.5L8 13v-3a4 4 0 0 1 4-4z" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        </>
      );
    case "chart":
      return (
        <>
          <path d="M3 3v18h18" />
          <path d="M7 14v4M12 10v8M17 6v12" />
        </>
      );
    case "user":
      return (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </>
      );
    case "shield":
      return (
        <>
          <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7z" />
          <path d="M9 12l2 2 4-4" />
        </>
      );
    case "gift":
      return (
        <>
          <rect x="3" y="8" width="18" height="13" rx="2" />
          <path d="M12 8v13M3 12h18" />
          <path d="M7.5 8a2.5 2.5 0 1 1 0-5c2.5 0 4.5 2.5 4.5 5" />
          <path d="M16.5 8a2.5 2.5 0 1 0 0-5c-2.5 0-4.5 2.5-4.5 5" />
        </>
      );
    case "wallet":
      return (
        <>
          <path d="M4 7h14a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a2 2 0 0 1-2-2V7z" />
          <path d="M16 11h5" />
          <circle cx="16" cy="14.5" r="1" />
        </>
      );
    default:
      return (
        <>
          <path d="M3 10.5 12 3l9 7.5V21H3z" />
          <path d="M9 21v-6h6v6" />
        </>
      );
  }
}

export function NavIcon({ type }: { type: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      {iconStroke(type)}
    </svg>
  );
}

export function getVisibleMenuSections(role: DashboardRole | null | undefined) {
  const normalizedRole = role && role in ROLE_META ? role : "organizer";

  return MENU_SECTIONS.map(section => {
    const sectionAllowed = !section.roles || section.roles.includes(normalizedRole);
    if (!sectionAllowed) return null;
    const items = section.items.filter(item => !item.roles || item.roles.includes(normalizedRole));
    if (items.length === 0) return null;
    return { ...section, items };
  }).filter((section): section is NavSection => Boolean(section));
}


