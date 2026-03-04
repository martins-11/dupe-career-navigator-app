/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

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
