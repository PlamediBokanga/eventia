# Deployment Guide (Vercel + Railway)

Ce guide couvre un deploiement MVP:
- Frontend sur Vercel
- Backend sur Railway
- Base MySQL sur Railway (ou PlanetScale)

## 1. Preparer la base de donnees
1. Creer une base MySQL.
2. Recuperer l'URL de connexion complete (`DATABASE_URL`).
3. Dans `backend`, executer localement:
   - `npm.cmd install`
   - `npm.cmd run prisma:generate`
   - `npm.cmd run prisma:migrate`

## 2. Deployer le backend (Railway)
1. Creer un projet Railway et connecter le repo.
2. Service cible: dossier `backend`.
3. Variables Railway a definir:
   - `DATABASE_URL`
   - `JWT_SECRET` (valeur longue et unique)
   - `PORT=4000` (Railway peut injecter son propre port, garder cette valeur par defaut)
   - `CORS_ORIGIN` (URL frontend Vercel, ex: `https://eventia.vercel.app`)
   - `APP_URL` (meme URL frontend Vercel)
4. Commandes de build/start:
   - Build: `npm run build`
   - Start: `npm run start`
5. Verifier l'endpoint:
   - `GET /health` doit repondre `status: ok`.

## 3. Deployer le frontend (Vercel)
1. Creer un projet Vercel et connecter le repo.
2. Root directory: `frontend`.
3. Variable Vercel:
   - `NEXT_PUBLIC_API_URL` = URL publique backend Railway
4. Build command: `npm run build`
5. Output: Next.js standard (auto-detecte par Vercel).

## 4. Post-deploiement (checklist)
1. Ouvrir `/organisateur/register` et creer un compte.
2. Se connecter via `/organisateur/login`.
3. Creer un evenement.
4. Ajouter un invite et ouvrir son lien d'invitation.
5. Tester:
   - confirmation/annulation
   - choix boissons
   - message livre d'or
   - export PDF invitation
6. Retour dashboard:
   - stats
   - export CSV invites
   - export PDF livre d'or

## 5. Points critiques
- Si creation d'evenement echoue avec 401: token absent/expire, reconnecter l'organisateur.
- Si invitation/QR utilise une mauvaise URL: verifier `APP_URL` backend.
- Si appels frontend bloques: verifier `CORS_ORIGIN` backend.
- Si backend ne demarre pas: verifier `DATABASE_URL` et migrations Prisma.
