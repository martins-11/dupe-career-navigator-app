/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * Silence Next.js dev warning:
   * "Cross origin request detected ... you will need to explicitly configure allowedDevOrigins"
   *
   * In Kavia preview/dev environments the UI may be served from a vscode-internal*.cloud.kavia.ai origin.
   */
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://vscode-internal-29588-beta.beta01.cloud.kavia.ai',
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
