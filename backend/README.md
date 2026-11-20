# EVENTIA Backend

API Express + Prisma pour le MVP EVENTIA.

## Scripts
- `npm.cmd run dev`: demarrage dev
- `npm.cmd run build`: build TypeScript
- `npm.cmd run start`: demarrage production
- `npm.cmd run prisma:generate`
- `npm.cmd run prisma:migrate`

## Variables d'environnement
- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `CORS_ORIGIN`
- `APP_URL` ou `FRONTEND_URL`
- `UPLOAD_DIR` (recommande en production : chemin absolu vers un dossier persistant pour les photos)

Les photos de couverture sont servies depuis `/uploads`. En production, configurez `UPLOAD_DIR` dans l'hebergement vers un dossier persistant, distinct du dossier temporaire de build/deploiement. Sans cette variable, le backend utilise `backend/uploads` (chemin stable par rapport au code, mais la persistance depend toujours de l'hebergeur).

## Endpoints principaux
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `PUT /auth/me`
- `GET /events`
- `POST /events`
- `PUT /events/:id`
- `DELETE /events/:id`
- `GET /guests/by-event/:eventId`
- `POST /guests`
- `PATCH /guests/:id/table`
- `GET /invitations/:token`
- `POST /invitations/:token/confirm`
- `POST /invitations/:token/cancel`
- `POST /invitations/:token/drinks`
- `POST /invitations/:token/guestbook`
- `GET /invitations/:token/pdf`
