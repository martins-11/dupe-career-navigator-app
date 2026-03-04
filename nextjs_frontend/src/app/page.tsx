import DocumentIngestion from './components/DocumentIngestion';

/**
 * Root route:
 * - MUST start the user in Document Ingestion (upload flow).
 * - Explore/Search is reachable at `/explore`.
 */
export default function Page() {
  return <DocumentIngestion />;
}
