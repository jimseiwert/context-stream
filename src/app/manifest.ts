import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ContextStream",
    short_name: "ContextStream",
    description:
      "Index your documentation and connect it to AI tools via MCP. Open source and self-hostable.",
    start_url: "/",
    display: "standalone",
    background_color: "#030711",
    theme_color: "#10b981",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
