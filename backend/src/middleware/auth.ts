import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { appConfig } from "../config";
import { readSessionToken } from "../session";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

function getJwtSecret() {
  return appConfig.jwtSecret;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const token = readSessionToken(req);
  if (!token) {
    return res.status(401).json({ message: "Session manquante." });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as {
      id: number;
      email: string;
    };
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ message: "Session invalide ou expiree." });
  }
}

export function signToken(payload: { id: number; email: string }) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}
