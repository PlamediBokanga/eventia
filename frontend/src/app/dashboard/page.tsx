"use client";

import { useEffect, useState } from "react";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { DashboardRoleBanner } from "@/components/dashboard/DashboardRoleBanner";
import { authFetch, type OrganizerProfile } from "@/lib/dashboard";
import { type DashboardRole } from "@/components/layout/dashboardNav";

function normalizeRole(value?: string | null): DashboardRole {
  if (value === "user" || value === "organizer" || value === "agency" || value === "company" || value === "superadmin") {
    return value;
  }
  return "organizer";
}

export default function DashboardPage() {
  const [role, setRole] = useState<DashboardRole>("organizer");

  useEffect(() => {
    let alive = true;

    async function load() {
      const res = await authFetch("/auth/me");
      if (!res.ok || !alive) return;
      const payload = (await res.json()) as { organizer?: OrganizerProfile };
      setRole(normalizeRole(payload.organizer?.role));
    }

    void load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <DashboardRoleBanner role={role} />
      <DashboardOverview title="Dashboard" role={role} />
    </div>
  );
}


