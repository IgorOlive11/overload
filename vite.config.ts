import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import type { Plugin } from "vite";

// O CSS do mock (design/mock) é a fonte do visual do app. Nele, @asset(pasta/arquivo) aponta para design/assets;
// aqui vira um caminho relativo que o Vite resolve, copia com hash e põe em cache no service worker.
const assetsDoMock = (): Plugin => ({
  name: "assets-do-mock",
  enforce: "pre",
  transform(codigo, id) {
    if (!/design\/mock\/[^/]+\.css$/.test(id.split("?")[0]!)) return null;
    return codigo.replace(/@asset\(([^)]+)\)/g, (_, caminho: string) => `../assets/${caminho}`);
  }
});

// O app e a API ficam na mesma origem: em produção o proxy do Coolify manda /api para a API;
// no desenvolvimento, o Vite faz o mesmo para a API local (npm run api).
export default defineConfig({
  plugins: [
    assetsDoMock(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["favicon.ico", "favicon-32.png", "icones/apple-touch-icon.png"],
      manifest: {
        name: "Overload",
        short_name: "Overload",
        description: "Treino com progressão de carga, mesmo sem internet na academia.",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0b0505",
        theme_color: "#080808",
        icons: [
          { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icones/icone-mascaravel-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2,ttf}"],
        navigateFallback: "/index.html",
        // A API nunca vem do cache: dado de treino vive no IndexedDB, não no service worker.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true
      }
    })
  ],
  server: { proxy: { "/api": "http://localhost:3000" } }
});
