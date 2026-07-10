import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { sites } from "./build/sites-vite-plugin.mjs";
import { socialImage } from "./build/social-image-plugin";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    socialImage("__SITE_ORIGIN__/og.png"),
    sites(),
    cloudflare({ configPath: "wrangler.jsonc" }),
  ],
});
