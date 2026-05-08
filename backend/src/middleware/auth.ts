import type { NextFunction, Request, Response } from "express";
import { readCookie, getSessionCookieName, type SessionRole } from "../lib/cookies";
import { verifySignedToken } from "../lib/tokens";

export type AuthenticatedUser = {
  id: string;
  role: "user" | "admin";
  email?: string;
  name?: string;
};

export type AuthenticatedRequest = Request & {
  auth?: AuthenticatedUser;
};

function readBearerToken(req: Request) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

function readSessionRoleHint(req: Request): SessionRole | null {
  const rawHeader = req.headers["x-session-role"];
  const value = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  if (value === "user" || value === "admin") {
    return value;
  }

  return null;
}

function readSessionToken(req: Request, preferredRole?: SessionRole | null) {
  const orderedRoles: SessionRole[] = preferredRole
    ? [preferredRole, ...(["user", "admin"] as SessionRole[]).filter((role) => role !== preferredRole)]
    : ["user", "admin"];

  for (const role of orderedRoles) {
    const token = readCookie(req, getSessionCookieName(role));
    if (token) {
      return token;
    }
  }

  return null;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = readBearerToken(req) || readSessionToken(req, readSessionRoleHint(req));
  if (!token) {
    return res.status(401).json({ message: "Akses ditolak. Token otorisasi wajib dikirim." });
  }

  try {
    const payload = verifySignedToken(token);
    req.auth = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
      name: payload.name
    };
    return next();
  } catch (error) {
    return res.status(401).json({
      message: error instanceof Error ? error.message : "Token tidak valid."
    });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = readBearerToken(req) || readCookie(req, getSessionCookieName("admin"));
  if (!token) {
    return res.status(401).json({ message: "Akses admin memerlukan sesi login admin." });
  }

  try {
    const payload = verifySignedToken(token);
    req.auth = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
      name: payload.name
    };

    if (req.auth.role !== "admin") {
      return res.status(403).json({ message: "Hanya admin yang boleh mengakses endpoint ini." });
    }

    return next();
  } catch (error) {
    return res.status(401).json({
      message: error instanceof Error ? error.message : "Token admin tidak valid."
    });
  }
}
