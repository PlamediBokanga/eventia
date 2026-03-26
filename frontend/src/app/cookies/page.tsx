export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-text/60">Politique cookies</p>
          <h1 className="title-1">Politique de cookies</h1>
          <p className="text-body-muted">Derniere mise a jour : Mars 2026</p>
        </div>

        <div className="space-y-4 text-body-muted">
          <p>
            Cette Politique de cookies explique comment EVENTIA utilise les cookies et technologies similaires lorsque
            vous utilisez notre plateforme. Elle vous informe sur ce que sont les cookies, comment nous les utilisons et
            les options dont vous disposez pour les gerer.
          </p>

          <section className="space-y-2">
            <p className="font-semibold text-text">1. Qu'est-ce qu'un cookie ?</p>
            <p>
              Un cookie est un petit fichier texte enregistre sur votre appareil (ordinateur, smartphone ou tablette)
              lorsque vous visitez un site web.
            </p>
            <p>
              Les cookies permettent au site de reconnaitre votre appareil et de memoriser certaines informations sur
              votre navigation afin d'ameliorer votre experience utilisateur.
            </p>
          </section>

          <section className="space-y-2">
            <p className="font-semibold text-text">2. Pourquoi EVENTIA utilise des cookies</p>
            <p>
              EVENTIA utilise des cookies afin de garantir le bon fonctionnement de la plateforme et d'ameliorer
              l'experience des utilisateurs.
            </p>
            <ul className="space-y-1">
              <li>- assurer le bon fonctionnement technique de la plateforme</li>
              <li>- maintenir la session des utilisateurs connectes</li>
              <li>- ameliorer la performance et la vitesse du site</li>
              <li>- analyser l'utilisation de la plateforme afin de l'ameliorer</li>
              <li>- garantir la securite des comptes et des donnees</li>
            </ul>
          </section>

          <section className="space-y-2">
            <p className="font-semibold text-text">3. Types de cookies utilises</p>
            <p className="text-text">Cookies essentiels</p>
            <p>
              Ces cookies sont necessaires au fonctionnement de la plateforme. Ils permettent notamment
              l'authentification des utilisateurs, la gestion des sessions et la navigation securisee sur le site.
            </p>
            <p className="text-text">Cookies de performance</p>
            <p>
              Ces cookies permettent de collecter des informations anonymes sur la maniere dont les utilisateurs
              utilisent la plateforme. Ils nous aident a comprendre les pages les plus consultees, les fonctionnalites
              les plus utilisees et les problemes techniques rencontres.
            </p>
            <p className="text-text">Cookies de fonctionnalite</p>
            <p>
              Ces cookies permettent de memoriser certaines preferences des utilisateurs afin d'ameliorer leur
              experience sur la plateforme (preferences d'affichage, langue, options d'utilisation).
            </p>
          </section>

          <section className="space-y-2">
            <p className="font-semibold text-text">4. Cookies tiers</p>
            <p>
              EVENTIA peut utiliser certains services tiers qui peuvent egalement placer des cookies sur votre
              appareil. Ces services peuvent inclure des outils d'analyse de trafic, des services de performance ou de
              securite. Ces cookies sont soumis aux politiques de confidentialite des services concernes.
            </p>
          </section>

          <section className="space-y-2">
            <p className="font-semibold text-text">5. Duree de conservation des cookies</p>
            <p>
              Cookies de session : ces cookies sont temporaires et sont supprimes automatiquement lorsque vous fermez
              votre navigateur.
            </p>
            <p>
              Cookies persistants : ces cookies restent stockes sur votre appareil pendant une periode limitee afin de
              memoriser certaines preferences.
            </p>
          </section>

          <section className="space-y-2">
            <p className="font-semibold text-text">6. Gestion des cookies</p>
            <p>
              Vous pouvez controler ou supprimer les cookies a tout moment en modifiant les parametres de votre
              navigateur. La plupart des navigateurs permettent de bloquer les cookies, supprimer les cookies existants
              et etre informe lorsque des cookies sont utilises.
            </p>
            <p>
              Veuillez noter que la desactivation de certains cookies peut affecter le fonctionnement de certaines
              fonctionnalites de la plateforme.
            </p>
          </section>

          <section className="space-y-2">
            <p className="font-semibold text-text">7. Mise a jour de la politique de cookies</p>
            <p>
              Cette politique peut etre mise a jour afin de refleter les evolutions de la plateforme ou des exigences
              legales. La date de la derniere mise a jour sera indiquee en haut de cette page.
            </p>
          </section>

          <section className="space-y-2">
            <p className="font-semibold text-text">8. Contact</p>
            <p>
              Pour toute question concernant cette Politique de cookies, vous pouvez contacter l'equipe EVENTIA :
              contact@eventia.app
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
