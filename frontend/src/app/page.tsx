const FEATURES = [
  {
    title: "Invitations numeriques",
    text:
      "Envoyez facilement des invitations modernes avec un lien securise et un QR code unique."
  },
  {
    title: "Gestion des invites",
    text: "Ajoutez, organisez et suivez vos invites en temps reel."
  },
  {
    title: "Suivi des presences",
    text: "Sachez instantanement qui sera present a votre evenement."
  },
  {
    title: "Choix des preferences",
    text: "Permettez aux invites de selectionner leurs preferences (boissons, options)."
  },
  {
    title: "Livre d'or numerique",
    text: "Collectez les messages et souvenirs de vos invites."
  }
];

const EVENT_PACKS = [
  {
    name: "Pack BASIC",
    price: "15 $",
    note: "Pour petits evenements",
    items: [
      "1 evenement",
      "Jusqu'a 100 invites",
      "QR Code invitation",
      "Confirmation presence",
      "Choix boissons",
      "Livre d'or numerique",
      "Tableau de bord organisateur"
    ],
    highlight: false
  },
  {
    name: "Pack STANDARD",
    price: "35 $",
    note: "Le plus vendu",
    items: [
      "1 evenement",
      "Jusqu'a 300 invites",
      "Toutes les fonctions BASIC",
      "Statistiques completes",
      "Export PDF des invites",
      "Export livre d'or"
    ],
    highlight: true
  },
  {
    name: "Pack PREMIUM",
    price: "75 $",
    note: "Pour evenements importants",
    items: [
      "1 evenement",
      "Jusqu'a 700 invites",
      "Toutes les fonctions STANDARD",
      "Scan QR code le jour J",
      "Theme design personnalise",
      "Support prioritaire"
    ],
    highlight: false
  }
];

const SUBSCRIPTIONS = [
  {
    name: "PRO ORGANIZER",
    price: "19 $ / mois",
    items: [
      "Jusqu'a 5 evenements / mois",
      "300 invites par evenement",
      "Statistiques completes",
      "Export donnees"
    ]
  },
  {
    name: "AGENCY",
    price: "49 $ / mois",
    items: [
      "Evenements illimites",
      "Jusqu'a 500 invites",
      "Personnalisation theme",
      "Branding agence"
    ]
  },
  {
    name: "ENTERPRISE",
    price: "99 $ / mois",
    items: ["Invites illimites", "Support VIP", "API future", "Multi-utilisateurs"]
  }
];

const ADDONS = [
  { name: "Notification WhatsApp / SMS", price: "5 $ / evenement" },
  { name: "Theme personnalise", price: "10 $" },
  { name: "Invitation PDF premium", price: "5 $" },
  { name: "Rapport evenement", price: "7 $" }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 page-enter">
      <div className="mx-auto max-w-6xl space-y-16">
        <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr] lg:items-center">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-text/60">Plateforme evenementielle</p>
            <h1 className="title-1">Organisez vos evenements avec simplicite et elegance</h1>
            <p className="text-body-muted">
              EVENTIA est une plateforme moderne qui vous permet de gerer vos invitations, vos invites et votre
              evenement en toute simplicite.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="/auth/register" className="btn-primary">
                Creer mon evenement
              </a>
              <a href="#fonctionnalites" className="btn-ghost">
                Decouvrir la plateforme
              </a>
            </div>
          </div>
          <div className="card p-6 space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-text/60">Apercu rapide</p>
            <div className="grid gap-3">
              {[
                "Invitations numeriques avec QR code",
                "Suivi des confirmations en temps reel",
                "Gestion des tables ou zones",
                "Livre d'or et preferences invites"
              ].map(item => (
                <div key={item} className="flex items-start gap-2 text-body-muted">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="card p-6 space-y-3">
            <h2 className="title-4">L'organisation d'un evenement peut vite devenir compliquee</h2>
            <p className="text-body-muted">
              Entre les listes d'invites, les confirmations de presence, les messages WhatsApp et les tableaux Excel,
              l'organisation d'un evenement peut rapidement devenir difficile a gerer.
            </p>
            <p className="text-body-muted">
              Les erreurs dans le nombre d'invites, les oublis et le manque de visibilite peuvent creer du stress et des
              couts supplementaires pour les organisateurs. EVENTIA simplifie tout ce processus.
            </p>
          </div>
          <div className="card p-6 space-y-3">
            <h2 className="title-4">Une plateforme concue pour simplifier</h2>
            <p className="text-body-muted">
              Avec EVENTIA, vous disposez d'un outil simple et puissant pour gerer chaque aspect de votre evenement.
              Tout est centralise dans une seule plateforme.
            </p>
            <ul className="text-body-muted space-y-1">
              <li>- Invitations numeriques avec QR code</li>
              <li>- Gestion intelligente des invites</li>
              <li>- Confirmation de presence en un clic</li>
              <li>- Tableau de bord clair pour l'organisateur</li>
              <li>- Livre d'or numerique pour les invites</li>
            </ul>
          </div>
        </section>

        <section id="fonctionnalites" className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-text/60">Fonctionnalites</p>
            <h2 className="title-2">Des fonctionnalites pensees pour vos evenements</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(feature => (
              <div key={feature.title} className="dashboard-card space-y-2">
                <p className="text-sm font-semibold">{feature.title}</p>
                <p className="text-small">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-[1.1fr,0.9fr]">
          <div className="card p-6 space-y-3">
            <h2 className="title-4">Pourquoi choisir EVENTIA ?</h2>
            <ul className="text-body-muted space-y-1">
              <li>- Organisation simplifiee</li>
              <li>- Invitations elegantes et modernes</li>
              <li>- Statistiques claires pour les organisateurs</li>
              <li>- Experience fluide pour les invites</li>
              <li>- Plateforme securisee et fiable</li>
            </ul>
          </div>
          <div className="card p-6 space-y-4">
            <h2 className="title-4">Ce que disent nos utilisateurs</h2>
            <p className="text-body-muted">
              "EVENTIA m'a permis de gerer facilement les invitations de mon mariage. Tout etait clair et simple pour
              nos invites."
            </p>
            <p className="text-small">Organisateur - Mariage</p>
          </div>
        </section>

        <section id="tarifs" className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-text/60">Offres evenement unique</p>
            <h2 className="title-2">Des packs adaptes a chaque evenement</h2>
            <p className="text-body-muted">
              Paiement en USD. Vous choisissez le pack qui correspond a la taille de votre evenement.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {EVENT_PACKS.map(pack => (
              <div
                key={pack.name}
                className={`dashboard-card space-y-4 ${pack.highlight ? "border-primary/40" : ""}`}
              >
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-text/60">{pack.note}</p>
                  <h3 className="title-4">{pack.name}</h3>
                  <p className="text-2xl font-semibold text-primary">{pack.price}</p>
                </div>
                <ul className="text-small space-y-1">
                  {pack.items.map(item => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
                <a href="/auth/register" className="btn-primary w-full">
                  Choisir ce pack
                </a>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-text/60">Abonnements</p>
            <h2 className="title-2">Pour wedding planners et agences</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {SUBSCRIPTIONS.map(plan => (
              <div key={plan.name} className="card p-6 space-y-3">
                <h3 className="title-4">{plan.name}</h3>
                <p className="text-xl font-semibold text-primary">{plan.price}</p>
                <ul className="text-small space-y-1">
                  {plan.items.map(item => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
                <a href="/contact" className="btn-ghost w-full">
                  Parler a l'equipe
                </a>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="card p-6 space-y-3">
            <h2 className="title-4">Options premium</h2>
            <p className="text-body-muted">Ajoutez des services pour enrichir l'experience de vos invites.</p>
            <div className="grid gap-2">
              {ADDONS.map(addon => (
                <div
                  key={addon.name}
                  className="flex items-center justify-between rounded-xl border border-primary/10 bg-white/70 px-4 py-3 text-sm"
                >
                  <span>{addon.name}</span>
                  <span className="font-semibold text-primary">{addon.price}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-6 space-y-3">
            <h2 className="title-4">Pret a organiser votre evenement ?</h2>
            <p className="text-body-muted">
              Creez votre evenement en quelques minutes et decouvrez une nouvelle maniere d'organiser vos invitations.
            </p>
            <a href="/auth/register" className="btn-primary w-full">
              Creer mon evenement
            </a>
            <a href="/contact" className="btn-ghost w-full">
              Demander une demo
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
