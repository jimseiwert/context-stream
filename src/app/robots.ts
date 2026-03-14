import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/docs", "/privacy", "/terms"],
        disallow: [
          "/dashboard/",
          "/sources/",
          "/search/",
          "/settings/",
          "/admin/",
          "/workspaces/",
          "/api/",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: "https://contextstream.dev/sitemap.xml",
    host: "https://contextstream.dev",
  };
}
