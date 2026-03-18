import DocumentIngestion from '@/app/components/DocumentIngestion';

/**
 * Ingestion route (App Router).
 *
 * Restored original ingestion flow UI (header/steps/buttons) implemented by `App`,
 * with only the upload section customized to support 3 upload containers.
 */
export default function IngestionPage() {
  return <DocumentIngestion />;
}
