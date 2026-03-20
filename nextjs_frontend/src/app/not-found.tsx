import * as React from 'react';

/**
 * Global 404 page for the Next.js App Router.
 *
 * Provides a stable not-found response and prevents Next from complaining
 * about missing required error components in some dev/proxy environments.
 */
export default function NotFound() {
  return (
    <div style={{ padding: 24, fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 18, margin: 0, color: '#111827' }}>Page not found</h1>
      <p style={{ marginTop: 8, color: '#374151' }}>
        The page you requested does not exist.
      </p>
    </div>
  );
}
