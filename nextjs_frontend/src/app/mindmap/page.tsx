import MvpSafePlaceholder from '@/app/components/MvpSafePlaceholder';
import MindmapClient from './MindmapClient';

// PUBLIC_INTERFACE
export default function Page() {
  /** Mind map visualization; optional for MVP and safe-fails if persona/current role context is missing. */
  return (
    <>
      <MvpSafePlaceholder
        title="Mind Map (Optional)"
        description="Mind map exploration is optional for the MVP. If your current role isn’t detected yet, complete ingestion + persona generation first."
        statusLabel="MVP‑safe"
        actions={[
          { label: 'Continue MVP flow: Ingestion', href: '/ingestion', variant: 'default' },
          { label: 'Explore roles (MVP)', href: '/explore', variant: 'outline' },
        ]}
      />
      <MindmapClient />
    </>
  );
}
