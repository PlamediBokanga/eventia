"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
// Singleton PrismaClient pour éviter les multiples connexions
const globalForPrisma = globalThis;
exports.prisma = (_a = globalForPrisma.prisma) !== null && _a !== void 0 ? _a : new client_1.PrismaClient({
    log: ["error", "warn"]
});
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = exports.prisma;
}
