import IngestionClient from './IngestionClient';

/**
 * Ingestion route (App Router).
 *
 * UI-only Document Ingestion screen (per latest UX update):
 * - 3 upload containers
 * - LinkedIn connect toggle (visual only)
 * - Animated uploaded file list preview (local state only)
 */
export default function IngestionPage() {
  return <IngestionClient />;
}
