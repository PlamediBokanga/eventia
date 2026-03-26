export default function HelpCenterPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-text/60">Centre d'aide</p>
          <h1 className="title-1">Comment pouvons-nous vous aider ?</h1>
          <p className="text-body-muted">
            Retrouvez les reponses essentielles pour utiliser EVENTIA rapidement.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              title: "Creer un evenement",
              text: "Configurez le nom, la date, le lieu et les options essentielles."
            },
            {
              title: "Inviter les invites",
              text: "Ajoutez vos invites puis envoyez leur lien d'invitation."
            },
            {
              title: "Scanner le jour J",
              text: "Utilisez le module Scan pour valider les entrees."
            },
            {
              title: "Exporter les donnees",
              text: "Telechargez les listes et rapports au format PDF/CSV."
            }
          ].map(item => (
            <div key={item.title} className="rounded-2xl border border-primary/10 bg-white/70 px-4 py-3">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-small">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-primary/10 bg-white/70 p-4 text-body-muted">
          Besoin d'une assistance personnalisee ? Ecrivez a support@eventia.app.
        </div>
      </div>
    </main>
  );
}
