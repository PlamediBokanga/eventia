import type { Metadata } from "next";
import "./globals.css";
import { PublicShell } from "@/components/layout/PublicShell";

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
        <PublicShell>{children}</PublicShell>
      </body>
    </html>
  );
}
