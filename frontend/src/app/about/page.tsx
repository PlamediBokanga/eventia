export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-5xl space-y-12">
        <section className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-text/60">A propos</p>
          <h1 className="title-1">EVENTIA - La nouvelle facon d'organiser vos evenements</h1>
          <p className="text-body-muted">
            EVENTIA est une plateforme digitale concue pour simplifier et moderniser la gestion des evenements. Que ce
            soit pour un mariage, une fete privee, un gala ou un evenement professionnel, EVENTIA permet aux
            organisateurs de gerer leurs invites, leurs invitations et le suivi des presences de maniere simple,
            elegante et efficace.
          </p>
          <p className="text-body-muted">
            Notre objectif est d'offrir une experience fluide, moderne et professionnelle, aussi bien pour les
            organisateurs que pour les invites.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Invitations envoyees", value: "500+" },
            { label: "Evenements crees", value: "50+" },
            { label: "Satisfaction utilisateurs", value: "95%" }
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl border border-primary/10 bg-white/70 px-4 py-3 text-center">
              <p className="text-xs text-text/60">{stat.label}</p>
              <p className="text-2xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="card p-6 space-y-3">
            <h2 className="title-4">Notre mission</h2>
            <p className="text-body-muted">
              Chez EVENTIA, notre mission est de transformer la maniere dont les evenements sont organises.
            </p>
            <p className="text-body-muted">
              Nous croyons qu'un evenement reussi commence par une organisation claire, simple et intelligente. C'est
              pourquoi nous avons concu une plateforme qui permet de gerer facilement les invitations, les
              confirmations de presence, les tables, les preferences des invites et bien plus encore.
            </p>
            <p className="text-body-muted">
              Nous voulons permettre aux organisateurs de se concentrer sur l'essentiel : creer des moments memorables.
            </p>
          </div>
          <div className="card p-6 space-y-3">
            <h2 className="title-4">Le defi de l'organisation d'evenements</h2>
            <p className="text-body-muted">
              Dans de nombreux evenements aujourd'hui, l'organisation repose encore sur des methodes traditionnelles :
              listes sur papier, fichiers Excel disperses, messages WhatsApp ou appels telephoniques.
            </p>
            <ul className="text-body-muted space-y-1">
              <li>- une mauvaise estimation du nombre d'invites</li>
              <li>- des erreurs dans la gestion des tables</li>
              <li>- des pertes financieres</li>
              <li>- un manque de visibilite pour les organisateurs</li>
            </ul>
            <p className="text-body-muted">EVENTIA est ne de ce constat.</p>
          </div>
        </section>

        <section className="card p-6 space-y-3">
          <h2 className="title-4">Notre solution</h2>
          <p className="text-body-muted">
            EVENTIA propose une plateforme simple et intuitive permettant de gerer chaque aspect de l'organisation d'un
            evenement.
          </p>
          <ul className="text-body-muted space-y-1">
            <li>- envoyer des invitations numeriques avec QR Code</li>
            <li>- suivre les confirmations de presence en temps reel</li>
            <li>- gerer les tables et les invites facilement</li>
            <li>- connaitre les preferences des invites (boissons, etc.)</li>
            <li>- collecter des messages via un livre d'or numerique</li>
          </ul>
          <p className="text-body-muted">Tout est centralise dans un tableau de bord clair et moderne.</p>
        </section>

        <section className="space-y-4">
          <h2 className="title-4 text-center">Nos valeurs</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                title: "Simplicite",
                text: "Nous croyons que la technologie doit simplifier la vie. EVENTIA est concu pour etre intuitif."
              },
              {
                title: "Fiabilite",
                text: "Des informations precises et a jour pour prendre les bonnes decisions."
              },
              {
                title: "Innovation",
                text: "Des technologies modernes pour apporter de nouvelles solutions."
              },
              {
                title: "Experience",
                text: "Chaque evenement est unique. Nous creons une experience elegante et memorable."
              }
            ].map(value => (
              <div key={value.title} className="dashboard-card space-y-2">
                <p className="text-sm font-semibold">{value.title}</p>
                <p className="text-small">{value.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-primary/10 bg-white/70 p-6 text-center">
          <p className="text-body-muted">
            "Les grands evenements ne se resument pas a une date ou un lieu. Ils sont faits de moments, de personnes et
            d'emotions. Notre mission est de rendre leur organisation aussi exceptionnelle que les souvenirs qu'ils
            creent."
          </p>
          <p className="mt-3 text-small">- L'equipe EVENTIA</p>
        </section>

        <section className="space-y-4">
          <h2 className="title-4 text-center">L'equipe derriere EVENTIA</h2>
          <p className="text-body-muted text-center">
            EVENTIA est developpe par une equipe passionnee par la technologie, l'innovation et la creation de
            solutions utiles.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { name: "BOKANGA PLAMEDI", role: "Developpeur / Fondateur, CEO BKG TECH" },
              { name: "ABIGAEL BOKANGA", role: "Operations & Relation client" }
            ].map(profile => (
              <div key={profile.role} className="dashboard-card">
                <p className="text-sm font-semibold">{profile.name}</p>
                <p className="text-small">{profile.role}</p>
              </div>
            ))}
          </div>
          <p className="text-body-muted text-center">
            Notre ambition est de construire des outils modernes qui repondent aux besoins reels des organisateurs
            d'evenements.
          </p>
        </section>

        <section className="card p-6 space-y-3">
          <h2 className="title-4">Pourquoi choisir EVENTIA</h2>
          <ul className="text-body-muted space-y-1">
            <li>- plateforme moderne et securisee</li>
            <li>- invitations numeriques elegantes</li>
            <li>- gestion intelligente des invites</li>
            <li>- experience simple pour les invites</li>
            <li>- statistiques claires pour les organisateurs</li>
          </ul>
          <p className="text-body-muted">
            EVENTIA permet de transformer l'organisation d'un evenement en une experience fluide, professionnelle et
            maitrisee.
          </p>
        </section>

        <section className="card p-6 text-center space-y-3">
          <h2 className="title-4">Pret a organiser votre prochain evenement avec EVENTIA ?</h2>
          <p className="text-body-muted">
            Commencez des aujourd'hui et decouvrez une nouvelle maniere d'organiser vos evenements.
          </p>
          <a href="/auth/register" className="btn-primary inline-flex">
            Creer mon evenement
          </a>
        </section>
      </div>
    </main>
  );
}
