"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const PUBLIC_ROUTES = new Set(["/", "/about", "/contact", "/cookies", "/faq", "/help", "/privacy", "/terms"]);

function isPublicPath(pathname: string | null) {
  return Boolean(pathname && PUBLIC_ROUTES.has(pathname));
}

const NAV_LINKS = [
  { href: "/#fonctionnement", label: "Fonctionnement" },
  { href: "/#tarifs", label: "Tarifs" },
  { href: "/about", label: "À propos" },
  { href: "/faq", label: "FAQ" }
];

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showPublicChrome = isPublicPath(pathname);
  const [showCookie, setShowCookie] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!showPublicChrome) return;
    const stored = window.localStorage.getItem("eventia_cookie_ok");
    if (!stored) setShowCookie(true);
  }, [showPublicChrome]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  function acceptCookies() {
    window.localStorage.setItem("eventia_cookie_ok", "1");
    setShowCookie(false);
  }

  return (
    <div className="flex min-h-screen flex-col">
      {showPublicChrome ? (
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex h-[70px] max-w-[1320px] items-center justify-between gap-4">
            <Link href="/" aria-label="EVENTIA, accueil" className="group flex shrink-0 items-center gap-2.5">
              <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 font-heading text-sm font-semibold text-white">E</span>
              <span className="text-[15px] font-semibold tracking-[0.2em] text-slate-950">EVENTIA</span>
            </Link>

            <nav aria-label="Navigation principale" className="hidden items-center gap-7 md:flex">
              {NAV_LINKS.map(link => (
                <Link key={link.href} href={link.href} className="text-[13px] font-medium text-slate-600 transition hover:text-slate-950 focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-4">
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              <Link href="/auth/login" className="inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950">Connexion</Link>
              <Link href="/auth/register" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200">Créer un compte</Link>
            </div>

            <button
              type="button"
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="public-mobile-menu"
              onClick={() => setMobileMenuOpen(open => !open)}
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 md:hidden"
            >
              <span aria-hidden="true" className="text-xl leading-none">{mobileMenuOpen ? "×" : "☰"}</span>
            </button>
          </div>

          {mobileMenuOpen ? (
            <nav id="public-mobile-menu" aria-label="Navigation mobile" className="border-t border-slate-100 px-1 py-3 md:hidden">
              <div className="mx-auto grid max-w-[1320px] gap-1">
                {NAV_LINKS.map(link => <Link key={link.href} href={link.href} className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">{link.label}</Link>)}
                <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                  <Link href="/auth/login" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-800">Connexion</Link>
                  <Link href="/auth/register" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white">Créer un compte</Link>
                </div>
              </div>
            </nav>
          ) : null}
        </header>
      ) : null}

      <div className="flex-1">{children}</div>

      {showPublicChrome ? (
        <footer className="border-t border-slate-200 bg-white px-5 py-12 sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-[1320px] gap-9 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div className="max-w-sm">
              <Link href="/" className="text-sm font-semibold tracking-[0.2em] text-slate-950">EVENTIA</Link>
              <p className="mt-4 text-sm leading-6 text-slate-600">Une plateforme pour préparer vos invitations, coordonner vos invités et organiser l’accueil de votre événement.</p>
              <p className="mt-4 text-xs text-slate-500">Un produit de BKG TECH.</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Découvrir</h2>
              <div className="mt-4 flex flex-col items-start gap-3 text-sm text-slate-700">
                <Link href="/#fonctionnement" className="hover:text-slate-950">Fonctionnalités</Link>
                <Link href="/#tarifs" className="hover:text-slate-950">Tarifs</Link>
                <Link href="/about" className="hover:text-slate-950">À propos</Link>
                <Link href="/faq" className="hover:text-slate-950">FAQ</Link>
              </div>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Votre espace</h2>
              <div className="mt-4 flex flex-col items-start gap-3 text-sm text-slate-700">
                <Link href="/auth/register" className="hover:text-slate-950">Créer un compte</Link>
                <Link href="/auth/login" className="hover:text-slate-950">Connexion</Link>
                <Link href="/help" className="hover:text-slate-950">Centre d’aide</Link>
                <Link href="/contact" className="hover:text-slate-950">Nous contacter</Link>
              </div>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Informations</h2>
              <div className="mt-4 flex flex-col items-start gap-3 text-sm text-slate-700">
                <Link href="/terms" className="hover:text-slate-950">Conditions d’utilisation</Link>
                <Link href="/privacy" className="hover:text-slate-950">Confidentialité</Link>
                <Link href="/cookies" className="hover:text-slate-950">Cookies</Link>
                <a href="mailto:support@eventia.app" className="hover:text-slate-950">support@eventia.app</a>
              </div>
            </div>
          </div>
          <div className="mx-auto mt-10 flex max-w-[1320px] flex-col gap-2 border-t border-slate-100 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} EVENTIA · BKG TECH</span>
            <span>Conçu pour une organisation plus sereine.</span>
          </div>
        </footer>
      ) : null}

      {showPublicChrome && showCookie ? (
        <aside aria-label="Information sur les cookies" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_16px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:inset-x-6 sm:bottom-6 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-600">EVENTIA utilise des cookies nécessaires au fonctionnement du site. Consultez notre politique pour en savoir plus.</p>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link href="/cookies" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700">En savoir plus</Link>
              <button type="button" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white" onClick={acceptCookies}>Compris</button>
            </div>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
