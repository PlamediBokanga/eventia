"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const app_1 = require("../app");
const prisma_1 = require("../prisma");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
function authToken(userId, email = "test@example.com") {
    return jsonwebtoken_1.default.sign({ id: userId, email }, process.env.JWT_SECRET || "dev-secret-change-me", {
        expiresIn: "1h"
    });
}
function deepSet(target, path, value) {
    const parts = path.split(".");
    let current = target;
    for (let i = 0; i < parts.length - 1; i += 1) {
        const key = parts[i];
        if (!current[key])
            current[key] = {};
        current = current[key];
    }
    current[parts[parts.length - 1]] = value;
}
function deepGet(target, path) {
    return path.split(".").reduce((acc, key) => acc === null || acc === void 0 ? void 0 : acc[key], target);
}
function applyPrismaMocks(mocks) {
    const prismaAny = prisma_1.prisma;
    const previous = new Map();
    for (const [path, value] of Object.entries(mocks)) {
        previous.set(path, deepGet(prismaAny, path));
        deepSet(prismaAny, path, value);
    }
    return () => {
        for (const [path, value] of previous.entries()) {
            deepSet(prismaAny, path, value);
        }
    };
}
async function withServer(fn) {
    const app = (0, app_1.createApp)();
    const server = app.listen(0);
    await new Promise((resolve, reject) => {
        server.once("listening", () => resolve());
        server.once("error", reject);
    });
    const address = server.address();
    if (!address || typeof address === "string")
        throw new Error("Server address unavailable");
    const baseUrl = `http://127.0.0.1:${address.port}`;
    try {
        await fn(baseUrl);
    }
    finally {
        await new Promise((resolve, reject) => {
            server.close(err => (err ? reject(err) : resolve()));
        });
    }
}
(0, node_test_1.default)("403 quand un organisateur accede a un evenement qui ne lui appartient pas", async () => {
    const restore = applyPrismaMocks({
        "event.findUnique": async () => ({ id: 1, organizerId: 999 })
    });
    try {
        await withServer(async (baseUrl) => {
            var _a;
            const res = await fetch(`${baseUrl}/events/1`, {
                headers: { Authorization: `Bearer ${authToken(1)}` }
            });
            const body = (await res.json());
            strict_1.default.equal(res.status, 403);
            strict_1.default.match((_a = body.message) !== null && _a !== void 0 ? _a : "", /Acces refuse/i);
        });
    }
    finally {
        restore();
    }
});
(0, node_test_1.default)("400 quand on assigne une table d'un autre evenement", async () => {
    const restore = applyPrismaMocks({
        "guest.findUnique": async () => ({ id: 3, eventId: 10 }),
        "event.findUnique": async () => ({ organizerId: 1 }),
        "table.findUnique": async () => ({ id: 999, eventId: 20, capacity: 10, _count: { guests: 0 } })
    });
    try {
        await withServer(async (baseUrl) => {
            var _a;
            const res = await fetch(`${baseUrl}/guests/3/table`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken(1)}`
                },
                body: JSON.stringify({ tableId: 999 })
            });
            const body = (await res.json());
            strict_1.default.equal(res.status, 400);
            strict_1.default.match((_a = body.message) !== null && _a !== void 0 ? _a : "", /Table invalide/i);
        });
    }
    finally {
        restore();
    }
});
(0, node_test_1.default)("400 quand un invite envoie une boisson hors evenement", async () => {
    const restore = applyPrismaMocks({
        "guestInvitation.findUnique": async () => ({ id: 5, guestId: 8, guest: { eventId: 2 } }),
        "guestDrinkChoice.deleteMany": async () => ({ count: 0 }),
        "drinkOption.findMany": async () => [{ id: 1 }, { id: 2 }]
    });
    try {
        await withServer(async (baseUrl) => {
            var _a;
            const res = await fetch(`${baseUrl}/invitations/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/drinks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    choices: [{ drinkOptionId: 999, quantity: 1 }]
                })
            });
            const body = (await res.json());
            strict_1.default.equal(res.status, 400);
            strict_1.default.match((_a = body.message) !== null && _a !== void 0 ? _a : "", /Boisson invalide/i);
        });
    }
    finally {
        restore();
    }
});
(0, node_test_1.default)("429 apres trop de tentatives de login", async () => {
    const restorePrisma = applyPrismaMocks({
        "organizer.findUnique": async () => null
    });
    const originalCompare = bcryptjs_1.default.compare;
    bcryptjs_1.default.compare = async () => false;
    try {
        await withServer(async (baseUrl) => {
            const email = `ratelimit-${Date.now()}@eventia.test`;
            let lastStatus = 0;
            for (let i = 0; i < 8; i += 1) {
                const res = await fetch(`${baseUrl}/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password: "bad-password" })
                });
                lastStatus = res.status;
            }
            strict_1.default.equal(lastStatus, 429);
        });
    }
    finally {
        restorePrisma();
        bcryptjs_1.default.compare = originalCompare;
    }
});
