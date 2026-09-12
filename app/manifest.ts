import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Margo Papelería",
    short_name: "Margo Papelería",
    description: "Registro de asistencias, salidas y jornadas de Margo Papelería.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f9f9f9",
    theme_color: "#0789c7",
    lang: "es-MX",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
