import express from "express";
import cors from "cors";
import path from "path";
import { eventsRouter } from "./routes/events";
import { guestsRouter } from "./routes/guests";
import { authRouter } from "./routes/auth";
import { invitationsRouter } from "./routes/invitations";
import { paymentsRouter } from "./routes/payments";
import { appConfig } from "./config";

function normalizeOrigin(value: string | undefined | null) {
  return value?.trim().replace(/\/+$/, "") || "";
}

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }

        const normalizedOrigin = normalizeOrigin(origin);
        const allowedOrigins = appConfig.corsOrigins;
        if (allowedOrigins.includes("*") || allowedOrigins.includes(normalizedOrigin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true
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