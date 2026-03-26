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
      <div className="min-h-screen p-3 sm:p-4 md:p-6">
        <div className="mx-auto w-full max-w-7xl space-y-4">
          <div className="flex justify-end">
            <ThemeToggle />
          </div>
          <Nav />
          <PageTransition>{children}</PageTransition>
        </div>
      </div>
    </ToastProvider>
  );
}
