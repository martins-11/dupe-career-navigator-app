import { redirect } from 'next/navigation';

/**
 * Root route
 *
 * Always redirect to `/login` so the login page is the first screen on refresh/initial load.
 *
 * NOTE:
 * The ingestion flow remains available at `/ingestion` (and is still the post-login default).
 */
export default function Page() {
  redirect('/login');
}
