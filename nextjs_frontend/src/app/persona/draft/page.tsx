import { Suspense } from 'react';
import DraftPersonaClient from './DraftPersonaClient';

export default function DraftPersonaPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-6 py-10 text-sm text-slate-600">
          Loading draft persona…
        </div>
      }
    >
      <DraftPersonaClient />
    </Suspense>
  );
}
