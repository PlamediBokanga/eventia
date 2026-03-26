export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-text/60">Politique de confidentialite</p>
          <h1 className="title-1">EVENTIA</h1>
          <p className="text-body-muted">Derniere mise a jour : Mars 2026</p>
        </div>

        <p className="text-body-muted">
          Chez EVENTIA, nous accordons une grande importance a la protection de la vie privee de nos utilisateurs. Cette
          politique de confidentialite explique quelles informations nous collectons, comment nous les utilisons et
          comment nous les protegeons lorsque vous utilisez notre plateforme.
        </p>

        <div className="space-y-6 text-body-muted">
          <section className="space-y-2">
            <h2 className="title-4">1. Presentation</h2>
            <p>
              EVENTIA est une plateforme web permettant aux organisateurs d'evenements de gerer leurs invitations, leurs
              invites et differents aspects lies a l'organisation d'un evenement.
            </p>
            <p>
              Dans le cadre de l'utilisation de nos services, certaines informations peuvent etre collectees afin
              d'assurer le bon fonctionnement de la plateforme.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="title-4">2. Informations que nous collectons</h2>
            <p>Nous pouvons collecter differentes categories d'informations.</p>
            <div className="space-y-2">
              <p className="font-medium text-text">Informations fournies par les organisateurs</p>
              <p>Lors de la creation d'un compte organisateur, nous pouvons collecter :</p>
              <ul className="space-y-1">
                <li>- Nom</li>
                <li>- Adresse email</li>
                <li>- Informations relatives aux evenements crees</li>
                <li>- Donnees liees aux invites</li>
              </ul>
              <p>Ces informations sont necessaires pour permettre la gestion des evenements sur la plateforme.</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-text">Informations concernant les invites</p>
              <p>
                Lorsqu'un organisateur ajoute des invites a un evenement, certaines informations peuvent etre
                enregistrees :
              </p>
              <ul className="space-y-1">
                <li>- Nom de l'invite</li>
                <li>- Numero de telephone</li>
                <li>- Table assignee</li>
                <li>- Statut de presence (confirme, en attente ou annule)</li>
                <li>- Preferences (par exemple choix de boissons)</li>
                <li>- Messages laisses dans le livre d'or</li>
              </ul>
              <p>Ces informations sont visibles uniquement par l'organisateur de l'evenement concerne.</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-text">Informations techniques</p>
              <p>
                Lors de l'utilisation de la plateforme, certaines informations techniques peuvent etre collectees
                automatiquement :
              </p>
              <ul className="space-y-1">
                <li>- Adresse IP</li>
                <li>- Type de navigateur</li>
                <li>- Donnees de navigation</li>
                <li>- Date et heure d'acces</li>
              </ul>
              <p>Ces informations permettent d'ameliorer la performance et la securite de la plateforme.</p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="title-4">3. Utilisation des informations</h2>
            <p>Les informations collectees sont utilisees pour :</p>
            <ul className="space-y-1">
              <li>- fournir et maintenir les services EVENTIA</li>
              <li>- permettre la gestion des evenements et des invitations</li>
              <li>- ameliorer l'experience utilisateur</li>
              <li>- assurer la securite de la plateforme</li>
              <li>- analyser l'utilisation de nos services afin de les ameliorer</li>
            </ul>
            <p>Nous n'utilisons pas les informations des utilisateurs a des fins commerciales sans leur consentement.</p>
          </section>

          <section className="space-y-2">
            <h2 className="title-4">4. Partage des informations</h2>
            <p>
              EVENTIA ne vend, ne loue et ne partage pas les donnees personnelles des utilisateurs avec des tiers, sauf
              dans les cas suivants :
            </p>
            <ul className="space-y-1">
              <li>- lorsque cela est necessaire au fonctionnement technique de la plateforme</li>
              <li>- lorsque la loi l'exige</li>
              <li>- pour proteger les droits et la securite de nos utilisateurs</li>
            </ul>
            <p>Les donnees des invites restent accessibles uniquement par l'organisateur de l'evenement.</p>
          </section>

          <section className="space-y-2">
            <h2 className="title-4">5. Securite des donnees</h2>
            <p>
              Nous mettons en oeuvre des mesures techniques et organisationnelles raisonnables afin de proteger les
              donnees des utilisateurs contre :
            </p>
            <ul className="space-y-1">
              <li>- l'acces non autorise</li>
              <li>- la perte</li>
              <li>- la divulgation</li>
              <li>- l'alteration des informations</li>
            </ul>
            <p>La communication avec la plateforme est securisee via des protocoles de chiffrement.</p>
          </section>

          <section className="space-y-2">
            <h2 className="title-4">6. Conservation des donnees</h2>
            <p>Les donnees liees aux evenements sont conservees pendant la duree necessaire au fonctionnement du service.</p>
            <p>Les organisateurs peuvent supprimer leurs evenements et les donnees associees depuis leur tableau de bord.</p>
          </section>

          <section className="space-y-2">
            <h2 className="title-4">7. Droits des utilisateurs</h2>
            <p>Les utilisateurs disposent de certains droits concernant leurs donnees personnelles, notamment :</p>
            <ul className="space-y-1">
              <li>- demander l'acces a leurs donnees</li>
              <li>- demander la correction de leurs informations</li>
              <li>- demander la suppression de leurs donnees</li>
            </ul>
            <p>Toute demande peut etre adressee a l'equipe EVENTIA via les coordonnees ci-dessous.</p>
          </section>

          <section className="space-y-2">
            <h2 className="title-4">8. Cookies et technologies similaires</h2>
            <p>EVENTIA peut utiliser des cookies ou technologies similaires afin de :</p>
            <ul className="space-y-1">
              <li>- maintenir la session utilisateur</li>
              <li>- ameliorer l'experience de navigation</li>
              <li>- analyser l'utilisation de la plateforme</li>
            </ul>
            <p>Les utilisateurs peuvent gerer les cookies via les parametres de leur navigateur.</p>
          </section>

          <section className="space-y-2">
            <h2 className="title-4">9. Modification de la politique de confidentialite</h2>
            <p>
              Cette politique de confidentialite peut etre mise a jour afin de refleter l'evolution de nos services ou
              des exigences legales.
            </p>
            <p>La date de mise a jour sera indiquee en haut de cette page.</p>
          </section>

          <section className="space-y-2">
            <h2 className="title-4">10. Contact</h2>
            <p>
              Pour toute question concernant cette politique de confidentialite ou la gestion des donnees personnelles,
              vous pouvez nous contacter :
            </p>
            <p>
              EVENTIA
              <br />
              Email : contact@eventia.app
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
