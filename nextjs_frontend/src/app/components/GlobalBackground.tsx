'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect } from 'react';

const APP_BG_CLASS = 'cn-app-bg';

/**
 * Routes that must NOT show the global purple background.
 * Keeping /login unchanged is a hard requirement.
 */
function shouldDisableGlobalBackground(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/login/');
}

/**
 * Use a layout effect in the browser so the class is applied before paint
 * (reduces “background not showing” / flicker during navigation).
 */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// PUBLIC_INTERFACE
export default function GlobalBackground() {
  /**
   * Toggles a global class to apply the background image on all routes
   * except those explicitly excluded (e.g., /login).
   *
   * We apply the class on BOTH:
   * - <body> (for the actual background image)
   * - <html> (for CSS variable overrides like --background)
   *
   * This is done client-side so we can branch on pathname without changing
   * layouts/routes (avoids unintended layout changes).
   */
  const pathname = usePathname();

  useIsomorphicLayoutEffect(() => {
    const disable = shouldDisableGlobalBackground(pathname || '');

    const body = document.body;
    const html = document.documentElement;

    if (disable) {
      body.classList.remove(APP_BG_CLASS);
      html.classList.remove(APP_BG_CLASS);
      return;
    }

    body.classList.add(APP_BG_CLASS);
    html.classList.add(APP_BG_CLASS);

    return () => {
      // Cleanup in case this component unmounts during navigation.
      body.classList.remove(APP_BG_CLASS);
      html.classList.remove(APP_BG_CLASS);
    };
  }, [pathname]);

  return null;
}
