import Link from "next/link";

const CONTACTS = [
  { label: "E-mail", value: "support@eventia.app", href: "mailto:support@eventia.app", note: "Pour vos questions et demandes d’assistance" },
  { label: "Téléphone / WhatsApp", value: "+243 895 109 438", href: "https://wa.me/243895109438", note: "Écrivez-nous directement sur WhatsApp" }
];

export default function ContactPage() {
  return (
    <main className="min-h-[70vh] bg-[#fbfaf8] px-5 py-12 text-slate-900 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-[1120px]">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#936d43]">Contact</p>
          <h1 className="mt-4 font-heading text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">Parlons de votre événement.</h1>
          <p className="mt-5 text-base leading-7 text-slate-600">Une question sur EVENTIA, votre compte ou une formule ? Choisissez le canal qui vous convient pour nous joindre.</p>
        </header>

        <div className="mt-10 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <section aria-label="Coordonnées de contact" className="grid gap-4 sm:grid-cols-2">
            {CONTACTS.map(item => (
              <article key={item.label} className="flex flex-col rounded-2xl border border-[#e9e4dc] bg-white p-6 sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                <h2 className="mt-5 break-words text-lg font-semibold text-slate-950">{item.value}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{item.note}</p>
                <a href={item.href} target={item.href.startsWith("https:") ? "_blank" : undefined} rel={item.href.startsWith("https:") ? "noreferrer" : undefined} className="site-button-primary mt-6 rounded-lg px-4">
                  {item.href.startsWith("mailto:") ? "Écrire un e-mail" : "Ouvrir WhatsApp"}<span aria-hidden="true" className="ml-2">↗</span>
                </a>
              </article>
            ))}
          </section>

          <aside className="rounded-2xl bg-[#f0ece5] p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#936d43]">Pour mieux vous aider</p>
            <h2 className="mt-3 font-heading text-2xl font-semibold text-slate-950">Précisez votre besoin.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Pour accélérer le traitement de votre demande, indiquez le sujet, l’adresse e-mail liée à votre compte et, si nécessaire, le nom de votre événement. Ne partagez jamais votre mot de passe.</p>
            <div className="mt-6 border-t border-[#ded7cc] pt-5">
              <p className="text-sm font-semibold text-slate-900">Vous cherchez une réponse immédiate ?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/faq" className="site-button-secondary min-h-10 rounded-lg px-3 text-sm">Consulter la FAQ</Link>
                <Link href="/help" className="site-button-secondary min-h-10 rounded-lg px-3 text-sm">Centre d’aide</Link>
              </div>
            </div>
          </aside>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">EVENTIA est un produit de BKG TECH.</p>
      </div>
    </main>
  );
}
