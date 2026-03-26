"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const events_1 = require("./routes/events");
const guests_1 = require("./routes/guests");
const auth_1 = require("./routes/auth");
const invitations_1 = require("./routes/invitations");
const payments_1 = require("./routes/payments");
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({
        origin: process.env.CORS_ORIGIN || "*"
    }));
    app.use(express_1.default.json({ limit: "8mb" }));
    app.use("/uploads", express_1.default.static(path_1.default.join(process.cwd(), "uploads")));
    app.get("/health", (_req, res) => {
        res.json({ status: "ok", message: "EVENTIA backend fonctionne." });
    });
    app.use("/auth", auth_1.authRouter);
    app.use("/events", events_1.eventsRouter);
    app.use("/guests", guests_1.guestsRouter);
    app.use("/invitations", invitations_1.invitationsRouter);
    app.use("/payments", payments_1.paymentsRouter);
    return app;
}
