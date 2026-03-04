'use client';

import App from '@/app/App';

/**
 * DocumentIngestion is the explicit landing-page component for the application.
 *
 * The root route (`/`) must start users in the document upload/ingestion experience.
 * The existing `App` component already implements this as its initial UI state,
 * so this component is a thin wrapper that makes the intent explicit for routing.
 */
export default function DocumentIngestion() {
  return <App />;
}
