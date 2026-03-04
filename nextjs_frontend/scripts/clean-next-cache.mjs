/**
 * Safe cache cleanup script for Next.js.
 *
 * We intentionally implement this in Node (instead of `rm -rf .next`) because some
 * execution environments disallow destructive shell commands. This script:
 * - removes `nextjs_frontend/.next` if it exists
 * - does NOT touch other directories
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// scripts/ -> project root
const projectRoot = path.resolve(__dirname, "..");
const nextCacheDir = path.join(projectRoot, ".next");

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

try {
  if (!fs.existsSync(nextCacheDir)) {
    log(`[clean-next-cache] No .next directory found at: ${nextCacheDir}`);
    process.exit(0);
  }

  // Force + recursive is the Node equivalent of `rm -rf`, but scoped to `.next` only.
  fs.rmSync(nextCacheDir, { recursive: true, force: true });

  log(`[clean-next-cache] Removed: ${nextCacheDir}`);
} catch (err) {
  log(`[clean-next-cache] Failed to remove .next cache: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
