import HeroShell from "../components/landing/hero-shell";
import Features from "../components/landing/features";
import HowItWorks from "../components/landing/howitworks";
import Pricing from "../components/landing/pricing";
import SeoContent, { faqs } from "../components/landing/seo-content";
import Testimonials from "../components/landing/testimonials";
import type { Metadata } from "next";
import { buildCanonical, defaultDescription, defaultOgImage, siteName } from "../lib/seo";

export const metadata: Metadata = {
  title: "Cek Plagiat dan Turnitin Murah Online",
  description:
    "Cek plagiat, cek Turnitin murah, dan cek similarity dokumen online untuk skripsi, jurnal, artikel, proposal, dan tugas kuliah. Proses cepat dan privat.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: `Cek Plagiat dan Turnitin Murah Online | ${siteName}`,
    description:
      "Cek plagiarisme dokumen online untuk skripsi, jurnal, artikel, proposal, dan tugas kuliah dengan laporan similarity yang jelas.",
    url: buildCanonical("/"),
    images: [defaultOgImage]
  },
  twitter: {
    title: `Cek Plagiat dan Turnitin Murah Online | ${siteName}`,
    description:
      "Cek plagiat, cek Turnitin murah, dan cek similarity dokumen online dengan proses cepat dan privat.",
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

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer
      }
    }))
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([organizationSchema, webSiteSchema, serviceSchema, faqSchema])
        }}
      />
      <HeroShell />
      <Features />
      <HowItWorks />
      <Pricing />
      <SeoContent />
      <Testimonials />
    </main>
  );
}
