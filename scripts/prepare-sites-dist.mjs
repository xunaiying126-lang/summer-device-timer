import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const distDirectory = path.resolve("dist");
const cloudflareOutputDirectory = path.join(distDirectory, "xu_summer_timer");
const workerSource = path.join(cloudflareOutputDirectory, "index.js");
const serverDirectory = path.join(distDirectory, "server");

await mkdir(serverDirectory, { recursive: true });
await copyFile(workerSource, path.join(serverDirectory, "index.js"));
await rm(cloudflareOutputDirectory, { recursive: true, force: true });
