import crypto from "node:crypto";
import { config } from "../config";

type FileAccessPayload = {
  checkRequestId: string;
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

export function createCheckFileAccessToken(checkRequestId: string, expiresInSeconds = 15 * 60) {
  const payload: FileAccessPayload = {
    checkRequestId,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyCheckFileAccessToken(token: string, expectedCheckRequestId: string) {
  const [encodedPayload, providedSignature] = token.split(".");

  if (!encodedPayload || !providedSignature) {
    throw new Error("Format token akses file tidak valid.");
  }

  const expectedSignature = sign(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(providedSignature);

  if (expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
    throw new Error("Signature token akses file tidak valid.");
  }

  const payload = JSON.parse(decodeBase64Url(encodedPayload)) as FileAccessPayload;
  if (!payload.checkRequestId || !payload.exp) {
    throw new Error("Payload token akses file tidak valid.");
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token akses file sudah kedaluwarsa.");
  }

  if (payload.checkRequestId !== expectedCheckRequestId) {
    throw new Error("Token akses file tidak cocok.");
  }

  return payload;
}
