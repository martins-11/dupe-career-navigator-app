import DocumentIngestion from '../src/app/components/DocumentIngestion';

/**
 * Root route:
 * - MUST start the user in Document Ingestion ("Upload Resume" area).
 * - Explore/Search is reachable at `/explore` (and later in the natural flow).
 */
export default function Page() {
  return <DocumentIngestion />;
}
