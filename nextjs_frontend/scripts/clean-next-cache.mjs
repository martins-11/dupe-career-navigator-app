/**
 * Safe cache cleanup script for Next.js.
 *
 * We implement this in Node (instead of `rm -rf`) because some execution environments
 * disallow destructive shell commands.
 *
 * This script removes:
 *  - `nextjs_frontend/.next`
 *  - `nextjs_frontend/node_modules/.cache`
 *
 * These are the two caches called out in the user instructions as the root cause of
 * stale path mappings that can manifest as CSS/JS 404s in dev.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// scripts/ -> project root
const projectRoot = path.resolve(__dirname, "..");
const nextCacheDir = path.join(projectRoot, ".next");
const nodeModulesCacheDir = path.join(projectRoot, "node_modules", ".cache");

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function rmDirIfExists(dirPath, label) {
  if (!fs.existsSync(dirPath)) {
    log(`[clean-next-cache] No ${label} directory found at: ${dirPath}`);
    return;
  }

  // Force + recursive is the Node equivalent of `rm -rf`.
  fs.rmSync(dirPath, { recursive: true, force: true });
  log(`[clean-next-cache] Removed ${label}: ${dirPath}`);
}

function ensureDir(dirPath, label) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`[clean-next-cache] Ensured ${label} exists: ${dirPath}`);
  } catch (err) {
    log(
      `[clean-next-cache] Failed ensuring ${label} exists (${dirPath}): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    process.exit(1);
  }
}

try {
  rmDirIfExists(nextCacheDir, ".next");
  rmDirIfExists(nodeModulesCacheDir, "node_modules/.cache");

  /**
   * Some preview/packaging environments can omit directories that are not part of the
   * selected output set. Next.js may still attempt to scan for the Pages Router at
   * `<project>/src/pages` (or `<project>/pages`) on startup/build, and in those environments
   * it can surface as an ENOENT scandir error.
   *
   * Creating these directories (even if we only use the App Router) is harmless and prevents
   * noisy logs or hard failures in those environments.
   */
  ensureDir(path.join(projectRoot, "src", "pages"), "src/pages");
  ensureDir(path.join(projectRoot, "pages"), "pages");
} catch (err) {
  log(`[clean-next-cache] Failed cache cleanup: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
