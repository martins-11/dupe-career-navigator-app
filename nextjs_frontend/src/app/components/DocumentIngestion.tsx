'use client';

import IngestionClient from '@/app/ingestion/IngestionClient';

/**
 * DocumentIngestion is the explicit landing-page component for the application.
 *
 * Legacy behavior: the root route (`/`) starts users in the document upload/ingestion
 * experience, using the same UI as `/ingestion`.
 */
export default function DocumentIngestion() {
  return <IngestionClient />;
}
