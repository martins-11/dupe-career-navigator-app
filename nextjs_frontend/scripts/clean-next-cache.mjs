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

function sleepSync(ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // busy wait (tiny delays only; avoids async top-level complexity in a build script)
  }
}

function rmDirIfExists(dirPath, label) {
  if (!fs.existsSync(dirPath)) {
    log(`[clean-next-cache] No ${label} directory found at: ${dirPath}`);
    return;
  }

  /**
   * Force + recursive is the Node equivalent of `rm -rf`.
   * In some CI/overlay filesystem environments, we can still see transient ENOTEMPTY
   * while the directory is being torn down. We'll retry a few times to avoid failing builds.
   */
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === maxAttempts) {
        throw err;
      }
      log(`[clean-next-cache] Retry ${attempt}/${maxAttempts} removing ${label} due to: ${msg}`);
      sleepSync(75 * attempt);
    }
  }

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
