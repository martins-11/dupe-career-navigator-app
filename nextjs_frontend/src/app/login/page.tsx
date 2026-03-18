import { Suspense } from 'react';

import LoginClient from './LoginClient';

/**
 * Login route (App Router).
 *
 * Renders a dual-panel (media + form) glassmorphism login page inspired by cn_login.png.
 * The interactive role switch (User/Admin) is implemented in a client component.
 *
 * NOTE: LoginClient uses `useSearchParams()`, which requires a Suspense boundary.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-transparent" />}>
      <LoginClient />
    </Suspense>
  );
}
