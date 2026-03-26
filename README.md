# EVENTIA

Application web de gestion evenementielle (MVP) avec:
- Frontend: Next.js
- Backend: Node.js + Express
- Base de donnees: MySQL + Prisma

## Structure
- `backend`: API REST, auth JWT, gestion evenements/invites/tables/boissons/livre d'or.
- `frontend`: interface organisateur + interface invitation invite.

## Prerequis
- Node.js 18+
- MySQL

## Demarrage rapide
1. Configurer les variables d'environnement backend (`backend/.env`).
2. Installer et preparer le backend:
   - `cd backend`
   - `npm.cmd install`
   - `npm.cmd run prisma:generate`
   - `npm.cmd run prisma:migrate`
   - `npm.cmd run dev`
3. Configurer et lancer le frontend:
   - `cd frontend`
   - `npm.cmd install`
   - definir `NEXT_PUBLIC_API_URL` (ex: `http://localhost:4000`)
   - `npm.cmd run dev`

## URLs locales
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Health backend: `http://localhost:4000/health`

## Variables d'environnement backend
- `DATABASE_URL`: connexion MySQL Prisma
- `JWT_SECRET`: secret JWT
- `PORT`: port API (defaut `4000`)
- `CORS_ORIGIN`: origine frontend autorisee
- `APP_URL` ou `FRONTEND_URL`: URL publique frontend (liens invitation / QR)

## Variables d'environnement frontend
- `NEXT_PUBLIC_API_URL`: URL backend

## Build production
- Backend: `cd backend && npm.cmd run build`
- Frontend: `cd frontend && npm.cmd run build`

## Deploiement
- Guide complet: `DEPLOYMENT.md`
