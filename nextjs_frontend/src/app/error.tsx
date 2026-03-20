'use client';

import * as React from 'react';

/**
 * Global error boundary for the Next.js App Router.
 *
 * Next.js requires an `app/error.tsx` to render runtime errors consistently.
 * Without it, dev/proxy environments can surface "missing required error components"
 * and break API route handling.
 */
export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  const { error, reset } = props;

  return (
    <html lang="en">
      <body style={{ fontFamily: 'ui-sans-serif, system-ui', padding: 24 }}>
        <h1 style={{ fontSize: 18, margin: 0, color: '#111827' }}>Something went wrong</h1>
        <p style={{ marginTop: 8, marginBottom: 16, color: '#374151' }}>
          An unexpected error occurred while rendering this page.
        </p>

        <details style={{ whiteSpace: 'pre-wrap', color: '#6B7280', marginBottom: 16 }}>
          <summary style={{ cursor: 'pointer' }}>Technical details</summary>
          <div style={{ marginTop: 8 }}>
            <div>
              <strong>Message:</strong> {error?.message || 'Unknown error'}
            </div>
            {error?.digest ? (
              <div>
                <strong>Digest:</strong> {error.digest}
              </div>
            ) : null}
          </div>
        </details>

        <button
          type="button"
          onClick={() => reset()}
          style={{
            border: '1px solid rgba(99,102,241,0.35)',
            background: '#ffffff',
            color: '#4F46E5',
            borderRadius: 10,
            padding: '10px 14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
