import { Suspense } from 'react';
import FinalizedPersonaClient from './finalizedPersonaClient';

export default function FinalizedPersonaPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-6 py-10 text-sm text-slate-600">Loading finalized persona…</div>
      }
    >
      <FinalizedPersonaClient />
    </Suspense>
  );
}
