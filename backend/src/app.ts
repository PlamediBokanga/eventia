import express from "express";
import cors from "cors";
import path from "path";
import { eventsRouter } from "./routes/events";
import { guestsRouter } from "./routes/guests";
import { authRouter } from "./routes/auth";
import { invitationsRouter } from "./routes/invitations";
import { paymentsRouter } from "./routes/payments";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "*"
    })
  );

  app.use(express.json({ limit: "8mb" }));
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", message: "EVENTIA backend fonctionne." });
  });

  app.use("/auth", authRouter);
  app.use("/events", eventsRouter);
  app.use("/guests", guestsRouter);
  app.use("/invitations", invitationsRouter);
  app.use("/payments", paymentsRouter);

  return app;
}
