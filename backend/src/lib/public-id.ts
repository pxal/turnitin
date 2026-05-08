import crypto from "node:crypto";
import { prisma } from "./prisma";

const PUBLIC_ID_LENGTH = 6;
const PUBLIC_ID_PREFIX = "TRT-";
const PUBLIC_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomPublicId() {
  const bytes = crypto.randomBytes(PUBLIC_ID_LENGTH);
  let result = "";

  for (let i = 0; i < PUBLIC_ID_LENGTH; i += 1) {
    result += PUBLIC_ID_ALPHABET[bytes[i] % PUBLIC_ID_ALPHABET.length];
  }

  return `${PUBLIC_ID_PREFIX}${result}`;
}

export async function generateUniqueCheckRequestPublicId() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = randomPublicId();
    const existing = await prisma.checkRequest.findFirst({
      where: {
        publicId: candidate
      },
      select: {
        id: true
      }
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Gagal membuat public ID unik untuk order.");
}
