import Link from "next/link";
import { Nav } from "@/components/layout/Nav";
import { PageTransition } from "@/components/layout/PageTransition";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ToastProvider } from "@/components/ui/Toast";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="dashboard-theme min-h-screen px-3 py-4 sm:px-5 md:px-7">
        <div className="mx-auto w-full max-w-7xl space-y-4">
          <header className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Link href="/dashboard" className="flex items-center gap-3 no-underline hover:no-underline">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#526b5c] text-sm font-bold tracking-wide text-white">E</span>
              <span>
                <span className="block text-sm font-bold tracking-[0.12em] text-slate-950">EVENTIA</span>
                <span className="block text-xs text-slate-500">Espace de gestion</span>
              </span>
            </Link>
            <ThemeToggle />
          </header>
          <Nav />
          <PageTransition>{children}</PageTransition>
        </div>
      </div>
    </ToastProvider>
  );
}
