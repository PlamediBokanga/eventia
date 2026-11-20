import Image from "next/image";
import Link from "next/link";

const PRINCIPLES = [
  { number: "01", title: "Clarté", text: "Les informations importantes restent visibles et faciles à retrouver." },
  { number: "02", title: "Simplicité", text: "Un parcours compréhensible pour l’organisateur comme pour l’invité." },
  { number: "03", title: "Attention", text: "Chaque détail de l’événement mérite une expérience soignée." }
];

export default function AboutPage() {
  return (
    <main className="bg-[#fbfaf8] px-5 py-12 text-slate-900 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-[1120px]">
        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#936d43]">À propos d’EVENTIA</p>
            <h1 className="mt-4 font-heading text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">Moins de dispersion. Plus de place pour l’événement.</h1>
            <p className="mt-5 text-base leading-7 text-slate-600">EVENTIA est une plateforme conçue pour aider les organisateurs à gérer leurs invitations, leurs invités et les temps forts de leur événement depuis un espace unique.</p>
            <p className="mt-4 text-sm leading-6 text-slate-600">Mariage, réception privée ou rencontre professionnelle : l’objectif est de rendre l’organisation plus lisible pour vous et plus simple pour vos invités.</p>
            <Link href="/auth/register" className="site-button-primary mt-7 px-5">Découvrir EVENTIA <span aria-hidden="true">→</span></Link>
          </div>
          <div className="relative h-[320px] overflow-hidden rounded-[24px] bg-slate-200 sm:h-[430px]">
            <Image src="/images/site/wedding-couple.jpg" alt="Un couple de mariés dans un cadre naturel" fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
            <p className="absolute bottom-5 left-5 max-w-sm font-heading text-2xl font-semibold text-white sm:bottom-7 sm:left-7 sm:text-3xl">L’organisation doit soutenir le moment, pas le compliquer.</p>
          </div>
        </section>

        <section className="mt-20 grid gap-10 border-y border-[#e9e4dc] py-12 md:grid-cols-[0.8fr_1.2fr] md:py-14">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#936d43]">Notre mission</p><h2 className="mt-3 font-heading text-3xl font-semibold leading-tight">Donner une vue d’ensemble à l’organisateur.</h2></div>
          <div className="space-y-4 text-sm leading-7 text-slate-600">
            <p>Préparer une liste, relancer les invités, répartir les places et transmettre les informations du jour J peut vite devenir fragmenté. EVENTIA rassemble ces étapes dans un environnement numérique organisé.</p>
            <p>La plateforme propose des invitations partageables, le suivi des réponses, la gestion des invités et des tables, ainsi que des outils utiles à l’accueil et aux souvenirs de l’événement.</p>
          </div>
        </section>

        <section className="mt-16 grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div className="grid gap-3 sm:grid-cols-3">
            {PRINCIPLES.map(item => (
              <article key={item.number} className="rounded-2xl border border-[#e9e4dc] bg-white p-5">
                <p className="font-heading text-sm font-semibold text-[#98754f]">{item.number}</p>
                <h3 className="mt-5 text-base font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
          <div className="relative h-[280px] overflow-hidden rounded-[24px] bg-slate-200 sm:h-[350px]">
            <Image src="/images/site/reception-venue.jpg" alt="Une salle de réception prête à accueillir les invités" fill sizes="(min-width: 1024px) 42vw, 100vw" className="object-cover object-center" />
          </div>
        </section>

        <section className="mt-16 flex flex-col gap-6 rounded-[24px] bg-[#20221f] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-9">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9c3a4]">Un projet en préparation ?</p><h2 className="mt-2 font-heading text-2xl font-semibold">Préparez votre prochain événement avec EVENTIA.</h2></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/auth/register" className="site-button-inverse min-h-11 rounded-lg px-4">Créer un compte</Link>
            <Link href="/contact" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/45 px-4 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">Nous contacter</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
