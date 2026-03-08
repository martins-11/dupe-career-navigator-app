import { Suspense } from 'react';
import ExploreClient from './ExploreClient';

// PUBLIC_INTERFACE
export default function Page() {
  /** Server wrapper for the Explore route; client component is wrapped in Suspense per Next.js requirements. */
  return (
    <Suspense
      fallback={
        <main style={{ padding: 24, color: '#4B6572', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
          Loading explore…
        </main>
      }
    >
      <ExploreClient />
    </Suspense>
  );
}
