import type { MetadataRoute } from "next";
import { buildCanonical, siteUrl } from "../lib/seo";

const now = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: buildCanonical("/upload"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8
    },
    {
      url: buildCanonical("/affiliate"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7
    }
  ];
}
