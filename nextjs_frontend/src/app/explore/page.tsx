"use client";

/**
 * Compatibility shim:
 * Some tooling/agents referenced `/src/app/**`. The canonical App Router pages live under `/app/**`.
 *
 * We re-export the real Explore page component using the tsconfig `@/*` alias (src/*),
 * avoiding brittle relative paths.
 */

export { default } from "@/../app/explore/page";
