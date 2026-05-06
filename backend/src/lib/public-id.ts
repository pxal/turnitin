import crypto from "node:crypto";
import { prisma } from "./prisma";

const PUBLIC_ID_LENGTH = 10;
const PUBLIC_ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function randomPublicId() {
  const bytes = crypto.randomBytes(PUBLIC_ID_LENGTH);
  let result = "";

  for (let i = 0; i < PUBLIC_ID_LENGTH; i += 1) {
    result += PUBLIC_ID_ALPHABET[bytes[i] % PUBLIC_ID_ALPHABET.length];
  }

  return result;
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
