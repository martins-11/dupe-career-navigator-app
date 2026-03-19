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

/**
 * Next.js `allowedDevOrigins` expects origin *domains* (hostnames), not full URL origins.
 * Example from docs: ['local-origin.dev', '*.local-origin.dev'] (no scheme/port).
 */
function toHostname(value) {
  try {
    if (!value) return null;
    const url = value.includes('://') ? new URL(value) : new URL(`https://${value}`);
    return url.hostname;
  } catch {
    return null;
  }
}

const frontendOriginFromEnv =
  toOrigin(process.env.NEXT_PUBLIC_FRONTEND_URL) ||
  toOrigin(process.env.REACT_APP_FRONTEND_URL) ||
  null;

const frontendHostnameFromEnv =
  toHostname(process.env.NEXT_PUBLIC_FRONTEND_URL) ||
  toHostname(process.env.REACT_APP_FRONTEND_URL) ||
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
          const wsFromOrigin = frontendOriginFromEnv
            ? frontendOriginFromEnv.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
            : null;

          return { websocketUrl: wsFromOrigin || 'auto' };
        })()
      : {}),

    /**
     * Server Actions origin allowlist (CSRF protection).
     * Some preview/proxy environments can invoke requests from a vscode-internal domain
     * that differs from the dev server's initial host. Allow those safe preview domains.
     */
    serverActions: {
      allowedOrigins: [
        ...(frontendHostnameFromEnv ? [frontendHostnameFromEnv] : []),

        // Kavia preview hosts (wildcards; hostname-only patterns per Next.js docs)
        'vscode-internal-*.cloud.kavia.ai',
        'vscode-internal-*.beta.beta01.cloud.kavia.ai',

        // Local dev
        'localhost',
        '127.0.0.1',
      ],
    },
  },

  /**
   * Silence Next.js dev warning:
   * "Cross origin request detected ... you will need to explicitly configure allowedDevOrigins"
   *
   * Next.js compares request Origin vs host and uses this allowlist in development.
   * Use hostname patterns (no scheme/port) as documented by Next.js.
   */
  allowedDevOrigins: [
    // Local dev defaults
    'localhost',
    '127.0.0.1',

    // Allow the actively configured preview/frontend hostname when provided.
    ...(frontendHostnameFromEnv ? [frontendHostnameFromEnv] : []),

    /**
     * Preview environment (Kavia):
     * Observed host patterns include:
     * - vscode-internal-<id>.cloud.kavia.ai
     * - vscode-internal-<id>-beta.beta01.cloud.kavia.ai
     */
    'vscode-internal-*.cloud.kavia.ai',
    'vscode-internal-*.beta.beta01.cloud.kavia.ai',
  ],

  /**
   * Proxy backend API calls when the frontend is served separately from the Express backend.
   *
   * Note: rewrite destinations are evaluated on the Next.js *server*.
   * Prefer BACKEND_INTERNAL_URL in dev/proxy environments.
   */
  async rewrites() {
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

      // Multiverse Explorer: graph + node/path details + bookmarks.
      // Needed in preview/proxy environments to avoid falling through to Next's 404.
      { source: '/api/multiverse/:path*', destination: `${backend}/api/multiverse/:path*` },

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

  /**
   * Fix build-time server chunk resolution:
   * During `next build`, Next loads `/.next/server/pages/_document.js`, which uses the
   * server webpack runtime to load additional chunks via `require("./" + chunkFile)`.
   *
   * In this repo's build output, server chunks are emitted under `.next/server/chunks/*.js`.
   * Without this override, the runtime may try to load `./<id>.js` from `.next/server/`,
   * causing `Cannot find module './682.js'` during "Collecting page data ...".
   */
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.output = config.output || {};
      config.output.chunkFilename = 'chunks/[id].js';
    }
    return config;
  },
};

export default nextConfig;
