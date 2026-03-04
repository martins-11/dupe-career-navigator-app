"use client";

/**
 * Compatibility shim:
 * This project’s Next.js App Router pages live under `/app/**`.
 * Some tooling/agents referenced `/src/app/**`; keep this file to avoid module-not-found errors
 * if any code still imports it.
 *
 * We re-export the real Explore page component.
 */

export { default } from "../../../app/explore/page";
