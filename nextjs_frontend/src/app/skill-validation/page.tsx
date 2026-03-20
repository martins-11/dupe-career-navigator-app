import MvpSafePlaceholder from '@/app/components/MvpSafePlaceholder';
import SkillValidationClient from './skillValidationClient';

// PUBLIC_INTERFACE
export default function SkillValidationPage() {
  /** Entry route for the Skill Validation guided chat experience. */
  return (
    <>
      <MvpSafePlaceholder
        title="Skill Validation (Non‑blocking)"
        description="This guided chat is optional for the MVP. If you haven’t generated a persona yet, you can still try it—but it works best after ingestion + persona generation."
        statusLabel="MVP‑safe"
        actions={[
          { label: 'Go to Ingestion (MVP)', href: '/ingestion', variant: 'default' },
          { label: 'View Finalized Persona', href: '/persona/finalized', variant: 'outline' },
        ]}
      />
      <SkillValidationClient />
    </>
  );
}
