import HeroShell from "../components/landing/hero-shell";
import Features from "../components/landing/features";
import HowItWorks from "../components/landing/howitworks";
import Testimonials from "../components/landing/testimonials";
import type { Metadata } from "next";
import { buildCanonical, defaultDescription, defaultOgImage, siteName } from "../lib/seo";

export const metadata: Metadata = {
  title: "Cek Plagiarisme Dokumen Online",
  description:
    "Cek plagiarisme dokumen online dengan proses cepat, privat, dan mudah. Cocok untuk skripsi, jurnal, artikel, dan dokumen akademik lainnya.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: `Cek Plagiarisme Dokumen Online | ${siteName}`,
    description: defaultDescription,
    url: buildCanonical("/"),
    images: [defaultOgImage]
  },
  twitter: {
    title: `Cek Plagiarisme Dokumen Online | ${siteName}`,
    description: defaultDescription,
    images: [defaultOgImage]
  }
};

export default function LandingPage() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: buildCanonical("/"),
    logo: buildCanonical("/logo.png")
  };

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: buildCanonical("/"),
    inLanguage: "id-ID",
    potentialAction: {
      "@type": "SearchAction",
      target: `${buildCanonical("/")}?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Layanan Cek Plagiarisme Dokumen",
    provider: {
      "@type": "Organization",
      name: siteName
    },
    areaServed: "ID",
    serviceType: "Cek plagiarisme dokumen online",
    description: defaultDescription,
    url: buildCanonical("/")
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([organizationSchema, webSiteSchema, serviceSchema])
        }}
      />
      <HeroShell />
      <Features />
      <HowItWorks />
      <Testimonials />
    </main>
  );
}
