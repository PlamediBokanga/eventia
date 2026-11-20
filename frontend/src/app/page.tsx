import Image from "next/image";
import Link from "next/link";

const FEATURES = [
  { number: "01", title: "Invitations qui donnent le ton", text: "Créez une page claire et élégante, partageable simplement avec chaque invité." },
  { number: "02", title: "Invités et réponses centralisés", text: "Suivez les confirmations, les demandes et les préférences depuis un seul espace." },
  { number: "03", title: "Une organisation maîtrisée", text: "Structurez les tables, le programme et les informations utiles avant le jour J." },
  { number: "04", title: "Un accueil fluide", text: "Retrouvez les outils de contrôle d’accès et le suivi des arrivées au même endroit." }
];

const STEPS = [
  { number: "01", title: "Créez votre événement", text: "Renseignez les informations essentielles et choisissez votre formule." },
  { number: "02", title: "Invitez et coordonnez", text: "Partagez les invitations, suivez les réponses et préparez votre organisation." },
  { number: "03", title: "Accueillez sereinement", text: "Le jour venu, retrouvez vos informations et gérez les accès depuis votre espace." }
];

const EVENT_PACKS = [
  { name: "BASIC", price: "15 $", note: "Pour les événements à taille humaine", items: ["1 événement", "Jusqu’à 100 invités", "Invitation avec QR code", "Confirmation de présence", "Choix des boissons", "Livre d’or numérique", "Tableau de bord organisateur"] },
  { name: "STANDARD", price: "35 $", note: "Pour une organisation plus complète", items: ["1 événement", "Jusqu’à 300 invités", "Toutes les fonctions Basic", "Statistiques complètes", "Export PDF des invités", "Export du livre d’or"] },
  { name: "PREMIUM", price: "75 $", note: "Pour les grandes célébrations", items: ["1 événement", "Jusqu’à 700 invités", "Toutes les fonctions Standard", "Scan QR le jour J", "Thème personnalisé", "Support prioritaire"] }
];

const SUBSCRIPTIONS = [
  { name: "PRO ORGANIZER", price: "19 $ / mois", text: "Pour les organisateurs réguliers", items: ["Jusqu’à 5 événements par mois", "300 invités par événement", "Statistiques complètes", "Export des données"] },
  { name: "AGENCY", price: "49 $ / mois", text: "Pour les agences événementielles", items: ["Événements illimités", "Jusqu’à 500 invités", "Thème personnalisé", "Branding agence"] },
  { name: "ENTERPRISE", price: "99 $ / mois", text: "Pour les organisations", items: ["Invités illimités", "Support VIP", "API future", "Multi-utilisateurs"] }
];

const GALLERY = [
  { src: "/images/site/wedding-couple.jpg", alt: "Un couple de mariés dans un cadre naturel", title: "Célébrations privées", type: "MARIAGE · ANNIVERSAIRE" },
  { src: "/images/site/reception-venue.jpg", alt: "Salle de réception aménagée pour accueillir des invités", title: "Réceptions et cérémonies", type: "RÉCEPTION · CÉRÉMONIE" },
  { src: "/images/site/ceremony-aisle.jpg", alt: "Allée de cérémonie décorée de fleurs", title: "Des moments à votre image", type: "ÉVÉNEMENT · SOUVENIR" }
];

function SectionIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#936d43]">{eyebrow}</p>
      <h2 className="mt-3 font-heading text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
      {text ? <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">{text}</p> : null}
    </div>
  );
}

function CheckMark() {
  return <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#f3eee6] text-[11px] font-bold text-[#7c5c39]">✓</span>;
}

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-[#fbfaf8] text-slate-900">
      <section className="mx-auto grid max-w-[1320px] gap-10 px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-12 lg:pb-24 lg:pt-16">
        <div className="relative z-10 max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#e8dfd2] bg-white px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#795b3d]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ad8354]" /> L’organisation, avec intention
          </p>
          <h1 className="mt-6 font-heading text-[2.65rem] font-semibold leading-[1.06] tracking-tight text-slate-950 sm:text-6xl">
            Vos événements méritent une organisation <span className="text-[#98754f]">sans fausse note.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Invitations, réponses, invités et accueil : EVENTIA rassemble l’essentiel pour préparer vos événements avec clarté, du premier envoi au jour J.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/auth/register" className="site-button-primary min-h-12 px-6">
              Créer mon événement <span aria-hidden="true" className="ml-2">→</span>
            </Link>
            <Link href="#fonctionnement" className="site-button-secondary min-h-12 px-6">
              Découvrir EVENTIA
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
            <span>Invitations partageables</span><span>·</span><span>Suivi des réponses</span><span>·</span><span>Outils pour le jour J</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-2xl lg:ml-auto">
          <div className="absolute -right-5 -top-5 h-32 w-32 rounded-full bg-[#eadfce]/70 blur-3xl" />
          <div className="relative h-[340px] overflow-hidden rounded-[26px] bg-[#e8e2d8] shadow-[0_24px_65px_rgba(53,42,29,0.16)] sm:h-[470px] lg:h-[560px]">
            <Image src="/images/site/ceremony-aisle.jpg" alt="Allée de cérémonie fleurie préparée pour un événement" fill priority sizes="(min-width: 1024px) 52vw, 100vw" className="object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-slate-950/10" />
            <div className="absolute left-5 top-5 rounded-full border border-white/35 bg-white/15 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md sm:left-7 sm:top-7">Chaque détail compte</div>
            <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 text-white sm:inset-x-8 sm:bottom-8">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/75">EVENTIA · VOTRE ESPACE ÉVÉNEMENT</p>
                <p className="mt-2 max-w-sm font-heading text-2xl font-semibold leading-tight sm:text-3xl">De l’invitation au dernier accueil.</p>
              </div>
              <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/35 text-xl sm:flex" aria-hidden="true">↗</span>
            </div>
          </div>
          <div className="absolute -bottom-5 right-4 hidden rounded-2xl border border-white/70 bg-white/95 px-5 py-4 shadow-lg backdrop-blur sm:block lg:-right-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Une vue d’ensemble</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Vos invités, vos réponses, au même endroit</p>
          </div>
        </div>
      </section>

      <section className="border-y border-[#eee9e2] bg-white">
        <div className="mx-auto grid max-w-[1320px] gap-5 px-5 py-8 sm:grid-cols-3 sm:px-8 lg:px-12">
          {[
            ["Une invitation", "Un lien clair à partager"],
            ["Un espace unique", "Les informations réunies"],
            ["Un jour J serein", "Les outils à portée de main"]
          ].map(([title, text], index) => (
            <div key={title} className={`flex items-start gap-4 ${index > 0 ? "sm:border-l sm:border-[#eee9e2] sm:pl-6" : ""}`}>
              <span className="font-heading text-sm font-semibold text-[#9b7952]">0{index + 1}</span>
              <div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="mt-1 text-sm text-slate-500">{text}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section id="fonctionnement" className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
        <SectionIntro eyebrow="Une méthode simple" title="Tout le nécessaire, sans éparpiller votre organisation." text="EVENTIA vous aide à garder les informations importantes accessibles et à offrir un parcours simple à vos invités." />
        <div className="mt-11 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(feature => (
            <article key={feature.number} className="group rounded-2xl border border-[#ece7df] bg-white p-5 transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(43,36,28,0.08)] sm:p-6">
              <p className="font-heading text-sm font-semibold text-[#a17e55]">{feature.number}</p>
              <h3 className="mt-7 text-base font-semibold leading-6 text-slate-950">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#f2eee8] py-20 sm:py-24">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <SectionIntro eyebrow="Une même exigence" title="Pour les événements qui vous ressemblent." text="Un mariage, une réception ou une célébration privée : adaptez votre organisation à l’occasion, pas l’inverse." />
            <Link href="/auth/register" className="site-button-secondary shrink-0 px-5">Commencer à organiser <span aria-hidden="true" className="ml-1">→</span></Link>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {GALLERY.map((item, index) => (
              <article key={item.src} className={`group relative isolate min-h-[300px] overflow-hidden rounded-2xl bg-slate-300 sm:min-h-[380px] ${index === 1 ? "md:mt-8" : ""}`}>
                <Image src={item.src} alt={item.alt} fill sizes="(min-width: 768px) 33vw, 100vw" className="z-0 object-cover transition duration-700 group-hover:scale-[1.04]" />
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950/75 via-slate-950/5 to-transparent" />
                <div className="absolute inset-x-5 bottom-5 z-20 text-white sm:inset-x-6 sm:bottom-6">
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-white/75">{item.type}</p>
                  <h3 className="mt-2 font-heading text-xl font-semibold sm:text-2xl">{item.title}</h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1320px] gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:px-12">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionIntro eyebrow="Comment ça marche" title="Trois étapes. Une organisation plus lisible." text="Commencez avec l’essentiel, puis complétez votre événement à votre rythme." />
        </div>
        <ol className="divide-y divide-[#e9e4dc] border-y border-[#e9e4dc]">
          {STEPS.map(step => (
            <li key={step.number} className="grid gap-3 py-6 sm:grid-cols-[70px_1fr] sm:gap-5 sm:py-8">
              <span className="font-heading text-sm font-semibold text-[#98754f]">{step.number}</span>
              <div><h3 className="text-lg font-semibold text-slate-950">{step.title}</h3><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{step.text}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section id="tarifs" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <SectionIntro eyebrow="Tarifs événement" title="Une formule adaptée à votre événement." text="Choisissez selon le nombre d’invités et les outils dont vous avez besoin. Les prix affichés sont en dollars américains." />
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {EVENT_PACKS.map(pack => (
              <article key={pack.name} className={`flex flex-col rounded-2xl border p-6 sm:p-7 ${pack.name === "STANDARD" ? "border-[#526b5c] bg-[#526b5c] text-white shadow-[0_20px_55px_rgba(35,55,43,0.18)]" : "border-[#e8e3db] bg-[#fbfaf8] text-slate-900"}`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${pack.name === "STANDARD" ? "text-white/65" : "text-slate-500"}`}>{pack.note}</p>
                <div className="mt-5 flex items-end justify-between gap-3"><h3 className="text-lg font-semibold">{pack.name}</h3><p className="font-heading text-3xl font-semibold">{pack.price}</p></div>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {pack.items.map(item => <li key={item} className="flex items-start gap-3"><span className={pack.name === "STANDARD" ? "text-white/75" : "text-slate-600"}><CheckMark /></span><span className={pack.name === "STANDARD" ? "text-white/85" : "text-slate-600"}>{item}</span></li>)}
                </ul>
                <Link href="/auth/register" className={`site-button-primary mt-7 w-full ${pack.name === "STANDARD" ? "site-button-inverse" : ""}`}>
                  Choisir {pack.name.toLowerCase()}
                </Link>
              </article>
            ))}
          </div>
          <div className="mt-14 border-t border-[#ece7df] pt-10">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#936d43]">Pour les professionnels</p><h3 className="mt-2 font-heading text-2xl font-semibold text-slate-950">Vous organisez toute l’année ?</h3></div>
              <p className="max-w-lg text-sm leading-6 text-slate-600">Les abonnements sont pensés pour les organisateurs, agences et entreprises qui gèrent plusieurs événements.</p>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {SUBSCRIPTIONS.map(plan => (
                <article key={plan.name} className="rounded-xl border border-[#ece7df] bg-[#fbfaf8] p-5">
                  <h4 className="text-xs font-semibold tracking-[0.14em] text-slate-500">{plan.name}</h4>
                  <p className="mt-3 font-heading text-2xl font-semibold text-slate-950">{plan.price}</p>
                  <p className="mt-1 text-sm text-slate-600">{plan.text}</p>
                  <ul className="mt-4 space-y-2 text-xs leading-5 text-slate-600">{plan.items.map(item => <li key={item} className="flex gap-2"><span aria-hidden="true" className="text-[#98754f]">✓</span>{item}</li>)}</ul>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-8 overflow-hidden rounded-[26px] bg-[#3e5447] px-6 py-9 text-white sm:px-10 sm:py-12 lg:flex-row lg:items-center lg:justify-between lg:px-14">
          <div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d9c3a4]">La prochaine étape</p><h2 className="mt-3 font-heading text-3xl font-semibold leading-tight sm:text-4xl">Donnez à votre événement l’organisation qu’il mérite.</h2><p className="mt-4 text-sm leading-6 text-white/70">Créez votre espace et commencez à préparer votre événement avec EVENTIA.</p></div>
          <Link href="/auth/register" className="site-button-secondary min-h-12 shrink-0 border-white bg-white px-6 text-[#34483a] hover:bg-[#edf2ee]">Créer mon espace <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </main>
  );
}
