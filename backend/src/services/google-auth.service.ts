import { config } from "../config";
import { fetchWithTimeout } from "../lib/http";

type GoogleTokenInfo = {
  sub: string;
  email: string;
  email_verified?: string;
  name?: string;
  picture?: string;
  aud?: string;
};

export async function verifyGoogleIdToken(idToken: string) {
  const response = await fetchWithTimeout(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    {
      method: "GET"
    }
  );

  const payload = (await response.json()) as GoogleTokenInfo & { error_description?: string };

  if (!response.ok || !payload.sub || !payload.email) {
    throw new Error(payload.error_description || "Token Google tidak valid.");
  }

  if (payload.aud !== config.googleClientId) {
    throw new Error("Google Client ID tidak cocok dengan token yang diterima.");
  }

  if (payload.email_verified !== "true") {
    throw new Error("Email Google belum terverifikasi.");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name || payload.email,
    picture: payload.picture || null
  };
}
