export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-text/60">Contact</p>
          <h1 className="title-1">Parlons de votre evenement</h1>
          <p className="text-body-muted">
            Notre equipe BKG TECH repond rapidement. Dites-nous ce que vous preparez.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr,1fr]">
          <div className="card p-6 space-y-4">
            <h2 className="title-4">Envoyer un message</h2>
            <form className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-small mb-1">Nom complet</label>
                  <input
                    className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-sm"
                    placeholder="Votre nom"
                  />
                </div>
                <div>
                  <label className="block text-small mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-sm"
                    placeholder="vous@email.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-small mb-1">Telephone</label>
                <input
                  className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-sm"
                  placeholder="+243..."
                />
              </div>
              <div>
                <label className="block text-small mb-1">Sujet</label>
                <input
                  className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-sm"
                  placeholder="Ex: Pack Premium, partenariat, demo"
                />
              </div>
              <div>
                <label className="block text-small mb-1">Message</label>
                <textarea
                  className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-sm"
                  rows={5}
                  placeholder="Parlez-nous de votre evenement..."
                />
              </div>
              <button type="button" className="btn-primary w-full">
                Envoyer
              </button>
              <p className="text-small">
                En envoyant ce formulaire, vous acceptez notre politique de confidentialite.
              </p>
            </form>
          </div>

          <div className="space-y-4">
            <div className="card p-6 space-y-3">
              <h2 className="title-4">Coordonnees</h2>
              <div className="text-body-muted space-y-2">
                <p>Email: support@eventia.app</p>
                <p>Telephone: +243895109438</p>
                <p>WhatsApp: disponible</p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="rounded-full border border-primary/10 px-3 py-1">Reponse sous 24h</span>
                <span className="rounded-full border border-primary/10 px-3 py-1">Support premium</span>
              </div>
            </div>
            <div className="card p-6 space-y-3">
              <h2 className="title-4">Pourquoi EVENTIA ?</h2>
              <ul className="text-body-muted space-y-2">
                <li>- Invitation digitale premium avec QR code.</li>
                <li>- Scan le jour J + suivi en temps reel.</li>
                <li>- Exports PDF/CSV pour vos equipes.</li>
                <li>- Livre d'or et souvenirs pour l'emotion.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-primary/10 bg-white/70 p-4 text-small">
              EVENTIA est un produit de BKG TECH. Base en RDC, disponible a l'international.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
