import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import LayoutWrapper from "../components/layout-wrapper";
import ScrollReveal from "../components/scroll-reveal";
import { defaultDescription, defaultOgImage, defaultTitle, siteName, siteUrl } from "../lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: `%s | ${siteName}`
  },
  description: defaultDescription,
  applicationName: siteName,
  keywords: [
    "cek plagiarisme",
    "cek turnitin",
    "cek similarity",
    "cek plagiasi online",
    "turnitin indonesia",
    "uji plagiarisme dokumen",
    "cek naskah skripsi",
    "verscan"
  ],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: siteUrl,
    siteName,
    title: defaultTitle,
    description: defaultDescription,
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: `${siteName} preview`
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: [defaultOgImage]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png"
  },
  category: "technology"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ScrollReveal />
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}
