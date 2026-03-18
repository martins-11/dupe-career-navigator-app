import DocumentIngestion from '../components/DocumentIngestion';

/**
 * Ingestion route (App Router).
 *
 * Hosts the existing document ingestion flow UI.
 * Login redirects here by default after setting the auth cookie.
 */
export default function IngestionPage() {
  return <DocumentIngestion />;
}
