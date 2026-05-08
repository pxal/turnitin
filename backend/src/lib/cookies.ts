import type { Request, Response } from "express";
import { config } from "../config";

export type SessionRole = "user" | "admin";

const SESSION_COOKIE_NAMES: Record<SessionRole, string> = {
  user: "turnicheck_user_session",
  admin: "turnicheck_admin_session"
};

function isProduction() {
  return config.nodeEnv === "production";
}

function resolveSameSite() {
  if (!isProduction()) {
    return "Lax";
  }

  const configured = config.sessionCookieSameSite;

  if (configured === "none") {
    return "None";
  }

  if (configured === "strict") {
    return "Strict";
  }

  if (configured === "lax") {
    return "Lax";
  }

  // In production/domain deployments, None is safer for cross-origin frontend->API fetches.
  return isProduction() ? "None" : "Lax";
}

function encodeCookieValue(value: string) {
  return encodeURIComponent(value);
}

export function getSessionCookieName(role: SessionRole = "user") {
  return SESSION_COOKIE_NAMES[role];
}

export function readCookie(req: Request, name: string) {
  const rawCookie = req.headers.cookie;
  if (!rawCookie) {
    return null;
  }

  for (const part of rawCookie.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey !== name) {
      continue;
    }

    return decodeURIComponent(rest.join("="));
  }

  return null;
}

export function setSessionCookie(
  res: Response,
  token: string,
  maxAgeSeconds: number,
  role: SessionRole = "user"
) {
  const sameSite = resolveSameSite();
  const cookieName = getSessionCookieName(role);
  const cookie = [
    `${cookieName}=${encodeCookieValue(token)}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    `Max-Age=${maxAgeSeconds}`
  ];

  if (isProduction() && config.sessionCookieDomain) {
    cookie.push(`Domain=${config.sessionCookieDomain}`);
  }

  if (isProduction() || sameSite === "None") {
    cookie.push("Secure");
  }

  res.append("Set-Cookie", cookie.join("; "));
}

function appendClearedCookie(res: Response, role: SessionRole) {
  const sameSite = resolveSameSite();
  const cookieName = getSessionCookieName(role);
  const cookie = [
    `${cookieName}=`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    "Max-Age=0"
  ];

  if (isProduction() && config.sessionCookieDomain) {
    cookie.push(`Domain=${config.sessionCookieDomain}`);
  }

  if (isProduction() || sameSite === "None") {
    cookie.push("Secure");
  }

  res.append("Set-Cookie", cookie.join("; "));
}

export function clearSessionCookie(res: Response, role?: SessionRole) {
  if (role) {
    appendClearedCookie(res, role);
    return;
  }

  appendClearedCookie(res, "user");
  appendClearedCookie(res, "admin");
}
