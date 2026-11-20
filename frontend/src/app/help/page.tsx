import Link from "next/link";

const GUIDES = [
  { step: "01", title: "Créer un événement", text: "Ajoutez son nom, sa date, son lieu et les informations destinées aux invités.", href: "/auth/register", action: "Créer mon espace" },
  { step: "02", title: "Préparer les invitations", text: "Ajoutez vos invités, configurez les détails et partagez leur lien d’invitation.", href: "/faq", action: "Voir les réponses" },
  { step: "03", title: "Suivre les confirmations", text: "Consultez les réponses et ajustez l’organisation depuis votre tableau de bord.", href: "/auth/login", action: "Ouvrir mon espace" },
  { step: "04", title: "Organiser l’accueil", text: "Retrouvez vos listes et outils d’accès pour préparer le jour de l’événement.", href: "/faq", action: "Consulter la FAQ" }
];

export default function HelpCenterPage() {
  return (
    <main className="min-h-[70vh] bg-[#fbfaf8] px-5 py-12 text-slate-900 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-[1120px]">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#936d43]">Centre d’aide</p>
          <h1 className="mt-4 font-heading text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">Avancez étape par étape.</h1>
          <p className="mt-5 text-base leading-7 text-slate-600">Les repères essentiels pour créer votre événement, inviter vos convives et préparer leur accueil.</p>
        </header>

        <section aria-label="Étapes d’utilisation d’EVENTIA" className="mt-10 grid gap-3 sm:grid-cols-2">
          {GUIDES.map(item => (
            <article key={item.step} className="flex flex-col rounded-2xl border border-[#e9e4dc] bg-white p-5 sm:p-6">
              <span className="font-heading text-sm font-semibold text-[#98754f]">{item.step}</span>
              <h2 className="mt-5 text-lg font-semibold text-slate-950">{item.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{item.text}</p>
          <Link href={item.href} className="site-button-quiet mt-5 min-h-10 justify-start px-0">{item.action}<span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </section>

        <section className="mt-8 flex flex-col gap-5 rounded-2xl bg-[#20221f] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div><h2 className="font-heading text-2xl font-semibold">Vous n’avez pas trouvé votre réponse ?</h2><p className="mt-2 text-sm leading-6 text-white/70">Notre équipe peut vous orienter vers le bon canal d’assistance.</p></div>
          <div className="flex flex-wrap gap-2">
            <Link href="/faq" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/45 px-4 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">Parcourir la FAQ</Link>
            <Link href="/contact" className="site-button-inverse min-h-11 rounded-lg px-4">Contacter EVENTIA</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
