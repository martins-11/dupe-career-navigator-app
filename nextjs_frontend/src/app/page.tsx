import DocumentIngestion from './components/DocumentIngestion';

/**
 * Root route:
 * - The existing ingestion flow remains the landing UI.
 * - A simple login gate (middleware) redirects unauthenticated users to `/login` first.
 * - Explore/Search is reachable at `/explore`.
 */
export default function Page() {
  return <DocumentIngestion />;
}
