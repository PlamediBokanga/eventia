import type { Metadata } from "next";
import "./globals.css";
import { PublicShell } from "@/components/layout/PublicShell";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "EVENTIA - Gestion evenementielle",
  description:
    "Application web de gestion d'evenements pour organisateurs et invites (invitations numeriques, tables, boissons, livre d'or)."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <ToastProvider>
          <PublicShell>{children}</PublicShell>
        </ToastProvider>
      </body>
    </html>
  );
}
