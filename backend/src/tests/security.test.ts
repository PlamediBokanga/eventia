import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app";
import { prisma } from "../prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

type MockMap = Record<string, unknown>;

function authToken(userId: number, email = "test@example.com") {
  return jwt.sign({ id: userId, email }, process.env.JWT_SECRET || "dev-secret-change-me", {
    expiresIn: "1h"
  });
}

function deepSet(target: Record<string, any>, path: string, value: unknown) {
  const parts = path.split(".");
  let current: Record<string, any> = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!current[key]) current[key] = {};
    current = current[key];
  }
  current[parts[parts.length - 1]] = value;
}

function deepGet(target: Record<string, any>, path: string) {
  return path.split(".").reduce<unknown>((acc, key) => (acc as Record<string, any>)?.[key], target);
}

function applyPrismaMocks(mocks: MockMap) {
  const prismaAny = prisma as unknown as Record<string, any>;
  const previous = new Map<string, unknown>();

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

async function withServer(fn: (baseUrl: string) => Promise<void>) {
  const app = createApp();
  const server = app.listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once("listening", () => resolve());
    server.once("error", reject);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Server address unavailable");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await fn(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(err => (err ? reject(err) : resolve()));
    });
  }
}

test("403 quand un organisateur accede a un evenement qui ne lui appartient pas", async () => {
  const restore = applyPrismaMocks({
    "event.findUnique": async () => ({ id: 1, organizerId: 999 })
  });

  try {
    await withServer(async baseUrl => {
      const res = await fetch(`${baseUrl}/events/1`, {
        headers: { Authorization: `Bearer ${authToken(1)}` }
      });
      const body = (await res.json()) as { message?: string };
      assert.equal(res.status, 403);
      assert.match(body.message ?? "", /Acces refuse/i);
    });
  } finally {
    restore();
  }
});

test("400 quand on assigne une table d'un autre evenement", async () => {
  const restore = applyPrismaMocks({
    "guest.findUnique": async () => ({ id: 3, eventId: 10 }),
    "event.findUnique": async () => ({ organizerId: 1 }),
    "table.findUnique": async () => ({ id: 999, eventId: 20, capacity: 10, _count: { guests: 0 } })
  });

  try {
    await withServer(async baseUrl => {
      const res = await fetch(`${baseUrl}/guests/3/table`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken(1)}`
        },
        body: JSON.stringify({ tableId: 999 })
      });
      const body = (await res.json()) as { message?: string };
      assert.equal(res.status, 400);
      assert.match(body.message ?? "", /Table invalide/i);
    });
  } finally {
    restore();
  }
});

test("400 quand un invite envoie une boisson hors evenement", async () => {
  const restore = applyPrismaMocks({
    "guestInvitation.findUnique": async () => ({ id: 5, guestId: 8, guest: { eventId: 2 } }),
    "guestDrinkChoice.deleteMany": async () => ({ count: 0 }),
    "drinkOption.findMany": async () => [{ id: 1 }, { id: 2 }]
  });

  try {
    await withServer(async baseUrl => {
      const res = await fetch(
        `${baseUrl}/invitations/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/drinks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            choices: [{ drinkOptionId: 999, quantity: 1 }]
          })
        }
      );
      const body = (await res.json()) as { message?: string };
      assert.equal(res.status, 400);
      assert.match(body.message ?? "", /Boisson invalide/i);
    });
  } finally {
    restore();
  }
});

test("429 apres trop de tentatives de login", async () => {
  const restorePrisma = applyPrismaMocks({
    "organizer.findUnique": async () => null
  });
  const originalCompare = (bcrypt as unknown as { compare: unknown }).compare;
  (bcrypt as unknown as { compare: unknown }).compare = async () => false;

  try {
    await withServer(async baseUrl => {
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

      assert.equal(lastStatus, 429);
    });
  } finally {
    restorePrisma();
    (bcrypt as unknown as { compare: unknown }).compare = originalCompare;
  }
});

