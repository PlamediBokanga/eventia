import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token manquant." });
  }

  const token = header.substring("Bearer ".length);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
    };
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ message: "Token invalide ou expiré." });
  }
}

export function signToken(payload: { id: number; email: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

