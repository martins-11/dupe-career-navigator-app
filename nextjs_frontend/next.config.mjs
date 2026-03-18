/** @type {import('next').NextConfig} */
function toOrigin(value) {
  try {
    if (!value) return null;
    // Accept either a full URL (https://host:port/path) or a bare origin (https://host:port)
    const url = value.includes('://') ? new URL(value) : new URL(`https://${value}`);
    return url.origin;
  } catch {
    return null;
  }
}

const frontendOriginFromEnv =
  toOrigin(process.env.NEXT_PUBLIC_FRONTEND_URL) ||
  toOrigin(process.env.REACT_APP_FRONTEND_URL) ||
  null;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * Ensure the dev client uses the current browser origin for the HMR websocket.
   * This can reduce HMR WS failures in proxied preview environments where host/port
   * inference differs between the dev server and the outer proxy layer.
   *
   * Safe: dev-only; ignored in production builds.
   */
  experimental: {
    ...(process.env.NODE_ENV === 'development'
      ? (() => {
          /**
           * Prefer an explicit websocket URL when we know the active frontend origin (preview).
           * This helps when "auto" mis-infers ws:// vs wss:// or hostnames behind proxies.
           *
           * If the preview layer still blocks websockets entirely, HMR will remain unavailable,
           * but the application will continue to run.
           */
          const wsFromOrigin = frontendOriginFromEnv
            ? frontendOriginFromEnv.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
            : null;

          return { websocketUrl: wsFromOrigin || 'auto' };
        })()
      : {}),
  },

  /**
   * Silence Next.js dev warning:
   * "Cross origin request detected ... you will need to explicitly configure allowedDevOrigins"
   *
   * IMPORTANT:
   * - Next.js compares the *full origin* (scheme + host + port).
   * - In Kavia preview environments, the vscode-internal host can change between sessions.
   * - Hardcoding a single preview host is brittle, so we allow wildcard vscode-internal origins
   *   (plus the active origin via env).
   */
  allowedDevOrigins: [
    // Local dev defaults
    'http://localhost:3000',
    'http://127.0.0.1:3000',

    // Allow the actively configured preview/frontend origin when provided.
    ...(frontendOriginFromEnv ? [frontendOriginFromEnv] : []),

    /**
     * Preview environment (Kavia):
     * The vscode-internal host changes between sessions, so hardcoding a single hostname is brittle.
     * Next.js (>=14) supports wildcard patterns here.
     *
     * Observed host patterns include BOTH:
     * - https://vscode-internal-<id>.cloud.kavia.ai:3000
     * - https://vscode-internal-<id>-beta.beta01.cloud.kavia.ai:3000
     *
     * Some preview layers may expose the dev server over http (or normalize origins differently),
     * so we allow both http and https wildcard forms.
     */
    'https://vscode-internal-*.cloud.kavia.ai:3000',
    'https://vscode-internal-*.beta.beta01.cloud.kavia.ai:3000',
    'http://vscode-internal-*.cloud.kavia.ai:3000',
    'http://vscode-internal-*.beta.beta01.cloud.kavia.ai:3000',

    // Extra safety: allow origin patterns without an explicit port (some proxies strip it).
    'https://vscode-internal-*.cloud.kavia.ai',
    'https://vscode-internal-*.beta.beta01.cloud.kavia.ai',
    'http://vscode-internal-*.cloud.kavia.ai',
    'http://vscode-internal-*.beta.beta01.cloud.kavia.ai',

    /**
     * Explicit fallbacks (kept for extra safety; not relied upon).
     * Always include explicit port when using https.
     */
    'https://vscode-internal-17827-beta.beta01.cloud.kavia.ai:3000',
    'https://vscode-internal-29588-beta.beta01.cloud.kavia.ai:3000',
  ],

  /**
   * Proxy backend API calls when the frontend is served separately from the Express backend.
   *
   * Note: rewrite destinations are evaluated on the Next.js *server*.
   * Prefer BACKEND_INTERNAL_URL in dev/proxy environments.
   */
  async rewrites() {
    /**
     * NOTE ON ENV VARS / PREVIEW 502s
     * ------------------------------
     * In Kavia preview environments, the frontend container historically exposes backend URLs
     * via REACT_APP_* variables (see container env list in the task description).
     *
     * If we only read NEXT_PUBLIC_* here, the rewrite destination falls back to localhost,
     * which is not reachable from the preview runtime. Next.js then returns 502 for any
     * proxied route (e.g. /api/*, /health, /docs).
     *
     * So we accept both naming conventions.
     */
    const backend =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_BASE ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.REACT_APP_API_BASE ||
      process.env.REACT_APP_BACKEND_URL ||
      'http://localhost:3001';

    return [
      { source: '/uploads/:path*', destination: `${backend}/uploads/:path*` },
      { source: '/orchestration/:path*', destination: `${backend}/orchestration/:path*` },
      { source: '/builds/:path*', destination: `${backend}/builds/:path*` },
      { source: '/documents/:path*', destination: `${backend}/documents/:path*` },
      { source: '/personas/:path*', destination: `${backend}/personas/:path*` },
      { source: '/ai/:path*', destination: `${backend}/ai/:path*` },
      { source: '/extraction/:path*', destination: `${backend}/extraction/:path*` },
      { source: '/health/:path*', destination: `${backend}/health/:path*` },

      // Explore: proxy roles endpoints (includes /api/roles/autocomplete).
      { source: '/api/roles/:path*', destination: `${backend}/api/roles/:path*` },

      // Explore: proxy recommendations endpoints (includes /api/recommendations/roles).
      { source: '/api/recommendations/:path*', destination: `${backend}/api/recommendations/:path*` },

      // Mindmap: interactive graph + node details + view-state persistence.
      { source: '/api/mindmap/:path*', destination: `${backend}/api/mindmap/:path*` },

      // Profile: role context, scoring, etc.
      { source: '/api/profile/:path*', destination: `${backend}/api/profile/:path*` },

      // Swagger UI + OpenAPI JSON served by the Express backend.
      { source: '/docs', destination: `${backend}/docs` },
      { source: '/docs/:path*', destination: `${backend}/docs/:path*` },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
