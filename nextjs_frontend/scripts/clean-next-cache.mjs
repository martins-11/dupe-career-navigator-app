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

try {
  rmDirIfExists(nextCacheDir, ".next");
  rmDirIfExists(nodeModulesCacheDir, "node_modules/.cache");
} catch (err) {
  log(`[clean-next-cache] Failed cache cleanup: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
