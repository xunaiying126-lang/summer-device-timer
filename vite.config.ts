import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { socialImage } from "./build/social-image-plugin";

export default defineConfig({
  base: "/summer-device-timer/",
  plugins: [
    react(),
    socialImage("https://xunaiying126-lang.github.io/summer-device-timer/og.png"),
  ],
});
