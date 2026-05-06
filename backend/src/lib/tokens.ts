import crypto from "node:crypto";
import { config } from "../config";

type TokenPayload = {
  sub: string;
  role: "user" | "admin" | "affiliate";
  email?: string;
  name?: string;
  exp: number;
};

function encodeBase64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function decodeBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(value: string) {
  return crypto.createHmac("sha256", config.jwtSecret).update(value).digest("base64url");
}

export function createSignedToken(payload: Omit<TokenPayload, "exp">, expiresInSeconds: number) {
  const body: TokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(body));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySignedToken(token: string): TokenPayload {
  const [encodedPayload, providedSignature] = token.split(".");

  if (!encodedPayload || !providedSignature) {
    throw new Error("Format token tidak valid.");
  }

  const expectedSignature = sign(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(providedSignature);

  if (expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
    throw new Error("Signature token tidak valid.");
  }

  const payload = JSON.parse(decodeBase64Url(encodedPayload)) as TokenPayload;
  if (!payload.sub || !payload.role || !payload.exp) {
    throw new Error("Payload token tidak valid.");
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token sudah kedaluwarsa.");
  }

  return payload;
}
