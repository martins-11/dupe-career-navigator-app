import { redirect } from 'next/navigation';

/**
 * Persona index route.
 *
 * We keep this as a redirect so all flows (including ingestion success) land on
 * the restored legacy draft persona UI at /persona/draft.
 */
export default function PersonaPage() {
  redirect('/persona/draft');
}
