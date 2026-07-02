import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const distDir = "dist";
const entryPages = ["xushihan", "xumuqiu", "parent"];

await Promise.all(
  entryPages.map(async (page) => {
    const pageDir = join(distDir, page);
    await mkdir(pageDir, { recursive: true });
    await copyFile(join(distDir, "index.html"), join(pageDir, "index.html"));
  }),
);
