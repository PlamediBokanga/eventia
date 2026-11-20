"use client";

import { useMemo, useState } from "react";

const FAQ_ITEMS = [
  {
    category: "Compte et acces",
    q: "Qu'est-ce que EVENTIA ?",
    a:
      "EVENTIA est une plateforme en ligne qui permet aux organisateurs d'evenements de gerer facilement leurs invitations et leurs invites."
  },
  {
    category: "Compte et acces",
    q: "Dois-je creer un compte pour utiliser EVENTIA ?",
    a:
      "Oui. Les organisateurs doivent creer un compte afin de pouvoir creer et gerer leurs evenements. Les invites peuvent acceder a leur invitation via un lien securise sans compte."
  },
  {
    category: "Invitations",
    q: "Comment les invites recoivent-ils leur invitation ?",
    a:
      "EVENTIA genere un lien d'invitation unique que vous pouvez partager par WhatsApp, SMS ou Email."
  },
  {
    category: "Invitations",
    q: "Les invites peuvent-ils confirmer leur presence ?",
    a:
      "Oui. Chaque invite peut confirmer ou annuler sa presence depuis son invitation en ligne."
  },
  {
    category: "Invitations",
    q: "Les invites doivent-ils installer une application ?",
    a: "Non. EVENTIA fonctionne directement dans un navigateur web."
  },
  {
    category: "Invitations",
    q: "Qu'est-ce que le QR code sur l'invitation ?",
    a:
      "Chaque invitation contient un QR code unique pour identifier rapidement un invite le jour J."
  },
  {
    category: "Gestion des invites",
    q: "Quels types d'evenements puis-je organiser avec EVENTIA ?",
    a:
      "Mariages, anniversaires, fetes privees, galas, evenements professionnels, conferences et seminaires."
  },
  {
    category: "Gestion des invites",
    q: "Puis-je gerer les tables de mes invites ?",
    a:
      "Oui. EVENTIA permet d'attribuer les invites a des tables pour organiser facilement la disposition."
  },
  {
    category: "Gestion des invites",
    q: "Les invites peuvent-ils indiquer leurs preferences ?",
    a:
      "Oui. Selon les options activees, ils peuvent indiquer des preferences comme les boissons."
  },
  {
    category: "Gestion des invites",
    q: "Qu'est-ce que le livre d'or numerique ?",
    a:
      "Un espace ou les invites peuvent laisser un message visible dans le tableau de bord de l'organisateur."
  },
  {
    category: "Gestion des invites",
    q: "Puis-je modifier les informations de mon evenement ?",
    a: "Oui. Tout est modifiable depuis votre tableau de bord."
  },
  {
    category: "Gestion des invites",
    q: "Combien d'invites puis-je ajouter ?",
    a: "Cela depend du plan choisi par l'organisateur."
  },
  {
    category: "Gestion des invites",
    q: "Puis-je supprimer un evenement ?",
    a: "Oui. Vous pouvez supprimer un evenement et ses donnees associees."
  },
  {
    category: "Securite et donnees",
    q: "Les donnees sont-elles securisees ?",
    a:
      "EVENTIA met en place des mesures de securite pour proteger les informations des utilisateurs et des invites."
  },
  {
    category: "Securite et donnees",
    q: "Comment contacter l'equipe EVENTIA ?",
    a: "Vous pouvez nous ecrire a support@eventia.app."
  }
];

const CATEGORIES = ["Tous", "Compte et acces", "Invitations", "Gestion des invites", "Securite et donnees"];

export default function FaqPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tous");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return FAQ_ITEMS.filter(item => {
      if (category !== "Tous" && item.category !== category) return false;
      if (!term) return true;
      return item.q.toLowerCase().includes(term) || item.a.toLowerCase().includes(term);
    });
  }, [search, category]);

  return (
    <main className="min-h-[70vh] bg-[#fbfaf8] px-5 py-12 text-slate-900 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#936d43]">Centre de réponses</p>
          <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">Questions fréquentes</h1>
          <p className="text-base leading-7 text-slate-600">Trouvez rapidement les informations utiles sur votre compte, vos invitations et la gestion des événements.</p>
        </div>

        <div className="space-y-4 rounded-2xl border border-[#e9e4dc] bg-white p-4 shadow-sm sm:p-5">
          <label htmlFor="faq-search" className="sr-only">Rechercher une question</label>
          <input
            id="faq-search"
            type="text"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Ex. partager une invitation, confirmer sa présence…"
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-4 focus:ring-slate-100"
          />
          <div aria-label="Filtrer par catégorie" className="flex flex-wrap gap-2">
            {CATEGORIES.map(item => (
              <button
                key={item}
                type="button"
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
                className={`inline-flex min-h-9 items-center justify-center rounded-full border px-3.5 text-xs font-medium transition focus:outline-none focus:ring-4 focus:ring-slate-100 ${
                  category === item ? "border-[#526b5c] bg-[#526b5c] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-[#9caf9f] hover:text-[#34483a]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div aria-live="polite" className="space-y-3">
          {filtered.map(item => (
            <details key={item.q} className="group rounded-xl border border-[#e9e4dc] bg-white px-5 py-4 open:shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold leading-6 text-slate-900 marker:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                {item.q}<span aria-hidden="true" className="shrink-0 text-lg font-normal text-slate-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-3xl border-t border-slate-100 pt-3 text-sm leading-6 text-slate-600">{item.a}</p>
            </details>
          ))}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
              <p className="text-sm font-semibold text-slate-900">Aucun résultat</p>
              <p className="mt-1 text-sm text-slate-600">Essayez un autre terme ou choisissez une autre catégorie.</p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
