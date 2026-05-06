const rawSiteUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.FRONTEND_BASE_URL ||
  "https://example.com";

export const siteUrl = rawSiteUrl.replace(/\/+$/, "");
export const siteName = "Verscan";
export const defaultTitle = "Verscan | Cek Plagiarisme Dokumen Online";
export const defaultDescription =
  "Verscan membantu cek plagiarisme dokumen online dengan proses cepat, privat, dan mudah digunakan untuk mahasiswa, dosen, peneliti, dan profesional.";
export const defaultOgImage = `${siteUrl}/og-image.png`;

export function buildCanonical(pathname = "/") {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${siteUrl}${normalizedPath}`;
}
