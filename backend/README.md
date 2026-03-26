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
