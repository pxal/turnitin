const rawSiteUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.FRONTEND_BASE_URL ||
  "https://example.com";

export const siteUrl = rawSiteUrl.replace(/\/+$/, "");
export const siteName = "Verscan";
export const defaultTitle = "Verscan | Cek Plagiat dan Turnitin Murah Online";
export const defaultDescription =
  "Verscan membantu cek plagiat, cek Turnitin murah, dan cek similarity dokumen online dengan proses cepat, privat, dan mudah untuk kebutuhan akademik.";
export const defaultOgImage = `${siteUrl}/og-image.png`;

export function buildCanonical(pathname = "/") {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${siteUrl}${normalizedPath}`;
}
