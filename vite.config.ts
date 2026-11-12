import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// O app e a API ficam na mesma origem: em produção o proxy do Coolify manda /api para a API;
// no desenvolvimento, o Vite faz o mesmo para a API local (npm run api).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["favicon.svg", "fontes/*.woff2", "icones/apple-touch-icon.png"],
      manifest: {
        name: "Overload",
        short_name: "Overload",
        description: "Treino com progressão de carga, mesmo sem internet na academia.",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#080808",
        theme_color: "#080808",
        icons: [
          { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icones/icone-mascaravel-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        // A API nunca vem do cache: dado de treino vive no IndexedDB, não no service worker.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true
      }
    })
  ],
  server: { proxy: { "/api": "http://localhost:3000" } }
});
