import App from "../src/app/App";

/**
 * Root route:
 * - MUST start the user in Document Ingestion ("Upload Resume" area).
 * - Explore/Search is reachable at `/explore` (and later in the natural flow).
 */
export default function Page() {
  return <App />;
}
