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
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-text/60">FAQ - Questions frequentes</p>
          <h1 className="title-1">FAQ</h1>
          <p className="text-body-muted">
            Bienvenue dans la foire aux questions d'EVENTIA. Vous trouverez ici les reponses aux questions les plus
            frequentes concernant l'utilisation de la plateforme.
          </p>
        </div>

        <div className="card p-4 space-y-3">
          <input
            type="text"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Rechercher dans la FAQ"
            className="w-full rounded-xl border border-primary/10 bg-white/80 px-4 py-2 text-sm focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`nav-chip text-xs ${
                  category === item ? "bg-primary text-white" : "bg-white/80 text-text/70 border border-primary/10"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map(item => (
            <details key={item.q} className="rounded-2xl border border-primary/10 bg-white/80 px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold">{item.q}</summary>
              <p className="mt-2 text-small">{item.a}</p>
            </details>
          ))}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-primary/10 bg-white/70 px-4 py-6 text-body-muted">
              Aucune reponse trouvee. Essayez un autre mot cle.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
