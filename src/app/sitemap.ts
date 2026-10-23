import type { MetadataRoute } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://demo.6x7.gr").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/new`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/subscribe`, changeFrequency: "monthly", priority: 0.7 },
  ];
}
