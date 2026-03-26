"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const PUBLIC_ROUTES = new Set([
  "/",
  "/about",
  "/contact",
  "/cookies",
  "/faq",
  "/help",
  "/privacy",
  "/terms"
]);

function isPublicPath(pathname: string | null) {
  if (!pathname) return false;
  return PUBLIC_ROUTES.has(pathname);
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showPublicChrome = isPublicPath(pathname);
  const [showCookie, setShowCookie] = useState(false);

  useEffect(() => {
    if (!showPublicChrome) return;
    const stored =
      typeof window !== "undefined" ? window.localStorage.getItem("eventia_cookie_ok") : null;
    if (!stored) setShowCookie(true);
  }, [showPublicChrome]);

  function acceptCookies() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("eventia_cookie_ok", "1");
    }
    setShowCookie(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {showPublicChrome ? (
        <header className="border-b border-primary/10 bg-background/80 px-4 py-4">
          <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3">
            <a href="/" className="font-heading text-lg text-text">
              EVENTIA
            </a>
            <nav className="flex flex-wrap items-center gap-3 text-xs">
              <a href="/" className="hover:text-text">Accueil</a>
              <a href="/#tarifs" className="hover:text-text">Tarifs</a>
              <a href="/about" className="hover:text-text">A propos</a>
              <a href="/contact" className="hover:text-text">Contact</a>
              <a href="/faq" className="hover:text-text">FAQ</a>
              <a href="/help" className="hover:text-text">Centre d'aide</a>
              <a href="/auth/login" className="btn-ghost">Connexion</a>
              <a href="/auth/register" className="btn-primary">Demarrer</a>
            </nav>
          </div>
        </header>
      ) : null}

      <div className="flex-1">{children}</div>

      {showPublicChrome ? (
        <footer className="border-t border-primary/10 bg-background/70 px-4 py-10 text-xs text-text/60">
          <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-[1.4fr,1fr,1fr,1fr]">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-text">EVENTIA</p>
              <p>
                Plateforme evenementielle premium pour invitations, QR check-in et coordination des invites.
              </p>
              <p className="text-[11px] text-text/60">Un produit de BKG TECH.</p>
              <div className="flex flex-wrap gap-3 text-[11px]">
                <span className="rounded-full border border-primary/10 px-3 py-1">Paiement USD</span>
                <span className="rounded-full border border-primary/10 px-3 py-1">Support WhatsApp</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.2em] text-text/60">Produit</p>
              <div className="flex flex-col gap-2">
                <a href="/#tarifs" className="hover:text-text">Tarifs</a>
                <a href="/auth/register" className="hover:text-text">Demarrer</a>
                <a href="/dashboard" className="hover:text-text">Dashboard</a>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.2em] text-text/60">Ressources</p>
              <div className="flex flex-col gap-2">
                <a href="/auth/login" className="hover:text-text">Connexion</a>
                <a href="/auth/register" className="hover:text-text">Creer un compte</a>
                <a href="/about" className="hover:text-text">A propos</a>
                <a href="/contact" className="hover:text-text">Contact</a>
                <a href="/faq" className="hover:text-text">FAQ</a>
                <a href="/help" className="hover:text-text">Centre d'aide</a>
                <a href="/cookies" className="hover:text-text">Politique cookies</a>
                <a href="/privacy" className="hover:text-text">Confidentialite</a>
                <a href="/terms" className="hover:text-text">Conditions</a>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.2em] text-text/60">Contact</p>
              <div className="flex flex-col gap-2">
                <span>support@eventia.app</span>
                <span>+243895109438</span>
                <span>WhatsApp disponible</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                <a href="https://facebook.com" className="hover:text-text">Facebook</a>
                <a href="https://instagram.com" className="hover:text-text">Instagram</a>
                <a href="https://tiktok.com" className="hover:text-text">TikTok</a>
                <a href="https://linkedin.com" className="hover:text-text">LinkedIn</a>
              </div>
            </div>
          </div>
          <div className="mx-auto mt-8 max-w-6xl border-t border-primary/10 pt-4 text-[11px] text-text/50 flex flex-wrap items-center justify-between gap-2">
            <span>© 2026 EVENTIA. Tous droits reserves.</span>
            <span>
              <a href="/terms" className="hover:text-text">Conditions</a>
              {" · "}
              <a href="/privacy" className="hover:text-text">Confidentialite</a>
              {" · "}
              <a href="/cookies" className="hover:text-text">Cookies</a>
            </span>
          </div>
        </footer>
      ) : null}

      {showPublicChrome && showCookie ? (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-4xl rounded-2xl border border-primary/10 bg-white/90 p-4 shadow-md">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-body-muted">
              EVENTIA utilise des cookies afin d'ameliorer votre experience sur notre plateforme. En continuant a
              utiliser ce site, vous acceptez notre utilisation des cookies.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-primary" onClick={acceptCookies}>
                Accepter
              </button>
              <a href="/cookies" className="btn-ghost">
                En savoir plus
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
