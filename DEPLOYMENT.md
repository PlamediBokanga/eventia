# Déploiement EVENTIA : Vercel + Hostinger

Architecture utilisée : frontend Next.js sur Vercel, API Express et fichiers uploadés sur Hostinger, base MySQL Hostinger.

## 1. Backend sur Hostinger

Dans hPanel, créer/configurer une application Node.js avec le dossier `backend` comme racine du projet. Utiliser une version Node.js prise en charge par les dépendances du projet.

Commandes de déploiement :

- Installation : `npm install`
- Build : `npm run build`
- Démarrage : `npm start`

Le script `prestart` exécute `prisma migrate deploy` avant `node dist/index.js`. Les migrations doivent être présentes et compatibles avec la base avant de démarrer l’application. Ne pas lancer `prisma db push --accept-data-loss` sur la base de production.

### Variables Hostinger requises

Définir les variables dans les paramètres de l’application Node.js, sans ajouter de guillemets autour des valeurs :

| Clé | Valeur |
| --- | --- |
| `DATABASE_URL` | `mysql://UTILISATEUR:MOT_DE_PASSE@localhost:3306/NOM_BASE` avec les identifiants exacts de la base Hostinger |
| `JWT_SECRET` | Secret aléatoire long, unique à la production; ne jamais le publier dans Git |
| `CORS_ORIGIN` | Origine Vercel exacte, par exemple `https://eventia-one.vercel.app` |
| `APP_URL` | URL HTTPS publique de l’API Hostinger; sert à former les liens absolus des images uploadées |
| `FRONTEND_URL` | URL HTTPS publique du frontend Vercel; sert à construire les liens d’invitation |

Ne pas intervertir ces deux valeurs : `APP_URL` est le domaine API Hostinger et `FRONTEND_URL` le domaine Vercel. `CORS_ORIGIN` doit autoriser l’origine Vercel.

Hostinger fournit généralement le port de l’application. Le backend utilise `process.env.PORT` et retombe sur `4000` en local; ne pas imposer `4000` si hPanel attribue un autre port.

### Variables optionnelles

- Google OAuth : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`. L’URI de retour doit correspondre à la route OAuth du backend et être enregistrée dans Google Cloud Console.
- Facebook OAuth : `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`, `FACEBOOK_REDIRECT_URI`.
- Vérification email : `AUTH_REQUIRE_EMAIL_VERIFICATION=true` et un service d’envoi email configuré si disponible.
- Paiements Flutterwave : `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_HASH`.
- Paiement mobile manuel : `MOBILE_MONEY_NUMBER`, `MOBILE_MONEY_NAME`.

Après modification des variables ou du code, redémarrer/redéployer l’application. Vérifier d’abord `https://URL_API/health` : la réponse attendue contient `"status":"ok"`.

## 2. Frontend sur Vercel

Dans les paramètres du projet Vercel :

- Root Directory : `frontend`
- Build command : `npm run build`
- Framework : Next.js (détection automatique)

Variable d’environnement Vercel, pour les environnements Production et Preview concernés :

| Clé | Valeur |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | URL HTTPS publique de l’API Hostinger, sans slash final; c’est aussi la base utilisée pour charger les images sous `/uploads/` |

Après avoir modifié cette variable, redéployer le frontend : les variables `NEXT_PUBLIC_*` sont intégrées au build.

## 3. Base de données et médias

- La base de données doit être la base MySQL sélectionnée dans `DATABASE_URL`.
- Vérifier que les tables et migrations nécessaires sont appliquées avant d’ouvrir l’application aux utilisateurs.
- Les fichiers envoyés par les utilisateurs sont stockés dans `backend/uploads`. Vérifier que ce dossier est inscriptible et que le stockage Hostinger est persistant après redéploiement. Si les fichiers sont supprimés lors d’un redéploiement, configurer un stockage objet persistant avant la phase pilote.
- Ne jamais mettre `backend/.env`, un mot de passe MySQL ou une clé secrète dans Git ou dans une variable `NEXT_PUBLIC_*`.

## 4. Vérification après déploiement

1. Ouvrir `/health` sur l’API et vérifier la réponse `status: ok`.
2. Ouvrir le frontend Vercel, créer un compte puis se connecter.
3. Créer un événement, ajouter un invité et ouvrir le lien d’invitation depuis un autre navigateur.
4. Vérifier l’image de l’événement et télécharger le PDF d’invitation.
5. Tester la réponse RSVP, le QR code et le scan sur téléphone via HTTPS.
6. Tester séparément la création et la confirmation des paiements si ces options sont activées.

## 5. Diagnostic rapide

- Échec `OPTIONS` ou CORS : vérifier que `CORS_ORIGIN` correspond exactement à l’origine du frontend, sans chemin ni slash final, puis redémarrer l’API.
- `Failed to fetch` ou timeout : ouvrir `/health`; si elle ne répond pas, vérifier l’état Node.js, les journaux et le port attribué dans hPanel.
- Erreur Prisma ou table/colonne absente : vérifier la base visée par `DATABASE_URL` et l’état des migrations. Ne pas résoudre cela par `db push --accept-data-loss` en production.
- Invitation/PDF ou image inaccessible : vérifier `APP_URL`/`FRONTEND_URL`, les droits d’écriture et la persistance de `backend/uploads`.
- Connexion Google indisponible : vérifier les trois variables Google et l’URL de retour enregistrée chez Google.
