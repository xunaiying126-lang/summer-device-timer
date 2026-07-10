import type { Plugin } from "vite";

export function socialImage(url: string): Plugin {
  return {
    name: "social-image",
    transformIndexHtml(html) {
      return html.split("__OG_IMAGE_URL__").join(url);
    },
  };
}
