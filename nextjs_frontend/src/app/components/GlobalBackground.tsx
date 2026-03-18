'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const APP_BG_CLASS = 'cn-app-bg';

/**
 * Routes that must NOT show the global purple background.
 * Keeping /login unchanged is a hard requirement.
 */
function shouldDisableGlobalBackground(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/login/');
}

// PUBLIC_INTERFACE
export default function GlobalBackground() {
  /**
   * Toggles a body class to apply the global background image on all routes
   * except those explicitly excluded (e.g., /login).
   *
   * We do this via a client component so we can branch on the current pathname
   * without restructuring layouts/routes (avoids unintended layout changes).
   */
  const pathname = usePathname();

  useEffect(() => {
    const disable = shouldDisableGlobalBackground(pathname || '');
    const body = document.body;

    if (disable) {
      body.classList.remove(APP_BG_CLASS);
      return;
    }

    body.classList.add(APP_BG_CLASS);

    return () => {
      // Cleanup in case this component unmounts during navigation.
      body.classList.remove(APP_BG_CLASS);
    };
  }, [pathname]);

  return null;
}
