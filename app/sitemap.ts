import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";

/** sitemap.xml : les pages publiques uniquement (voir app/robots.ts). */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteConfig.url, changeFrequency: "weekly", priority: 1 },
    { url: `${siteConfig.url}/signup`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteConfig.url}/login`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
