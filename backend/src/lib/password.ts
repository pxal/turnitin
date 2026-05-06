import crypto from "node:crypto";

function timingSafeEqualString(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export function hashSha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hashScrypt(value: string, salt: string) {
  return crypto.scryptSync(value, salt, 64).toString("hex");
}

export function hashPassword(value: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = hashScrypt(value, salt);
  return `scrypt:${salt}:${derivedKey}`;
}

export function verifyPassword(input: string, storedHash: string) {
  if (!storedHash) {
    return false;
  }

  if (storedHash.startsWith("scrypt:")) {
    const [, salt, expected] = storedHash.split(":");
    if (!salt || !expected) {
      return false;
    }

    return timingSafeEqualString(hashScrypt(input, salt), expected);
  }

  if (storedHash.startsWith("sha256:")) {
    return timingSafeEqualString(hashSha256(input), storedHash.slice("sha256:".length));
  }

  return timingSafeEqualString(input, storedHash);
}

export function needsPasswordRehash(storedHash: string) {
  return !storedHash.startsWith("scrypt:");
}
