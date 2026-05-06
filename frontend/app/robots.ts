import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/upload", "/affiliate"],
        disallow: [
          "/admin/",
          "/affiliate/dashboard",
          "/affiliate/login",
          "/affiliate/register",
          "/history",
          "/payment",
          "/payment/",
          "/processing",
          "/processing/"
        ]
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
