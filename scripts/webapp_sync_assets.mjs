import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const sourceDir = path.resolve(repoRoot, "apps/webapp/assets");
const targetDir = path.resolve(repoRoot, "apps/webapp/dist/assets");

async function collectFiles(dir, relativeBase = "") {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const rel = path.join(relativeBase, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectFiles(abs, rel)));
    } else if (entry.isFile()) {
      out.push({ abs, rel });
    }
  }
  return out;
}

async function main() {
  if (!fs.existsSync(sourceDir)) {
    console.log(`[webapp-sync-assets] source missing: ${sourceDir}`);
    return;
  }
  await fsp.mkdir(targetDir, { recursive: true });
  const files = await collectFiles(sourceDir, "");
  let copied = 0;
  for (const file of files) {
    const toPath = path.join(targetDir, file.rel);
    await fsp.mkdir(path.dirname(toPath), { recursive: true });
    await fsp.copyFile(file.abs, toPath);
    copied += 1;
  }
  console.log(`[webapp-sync-assets] copied ${copied} files -> ${targetDir}`);
}

main().catch((err) => {
  console.error("[webapp-sync-assets] failed", err);
  process.exitCode = 1;
});
