'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Compass,
  Upload,
  Users,
  Network,
  Sparkles,
  Settings,
  type LucideIcon,
} from 'lucide-react';

import { loadPersona, loadPersonaId } from '@/lib/personaStorage';

type NavItem =
  | {
      kind: 'link';
      href: string;
      label: string;
      icon: LucideIcon;
      exact?: boolean;
    }
  | {
      kind: 'dummy';
      label: string;
      icon: LucideIcon;
      disabledReason?: string;
    };

function getInitials(label: string): string {
  const base = String(label ?? '').trim();
  if (!base) return '•';
  const parts = base.split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return initials || '•';
}

function derivePersonaTitleFromStoredJson(personaJson: any): string {
  if (!personaJson || typeof personaJson !== 'object') return '';

  // Prefer PersonaDraft shape
  const headline = personaJson?.profile?.headline;
  if (typeof headline === 'string' && headline.trim()) return headline.trim();

  // Common alternates
  const candidates = [
    personaJson?.title,
    personaJson?.role,
    personaJson?.headline,
    personaJson?.current_role,
    personaJson?.currentRole,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }

  return '';
}

// PUBLIC_INTERFACE
export default function GlobalSidebarLayout({ children }: { children: React.ReactNode }) {
  /**
   * Global app chrome wrapper:
   * - Fixed, transparent/violet gradient sidebar (identity + icon navigation).
   * - Non-disruptive: main content is padded (no overlap), no theme-token overrides.
   * - Avoids breaking sensitive visuals (e.g., Explore mindmap) by keeping styles scoped
   *   to this wrapper only.
   */
  const pathname = usePathname();
  const safePathname = pathname ?? '';

  // Keep login uncluttered / avoid disrupting its bespoke layout.
  const shouldShowSidebar = safePathname !== '/login';

  const [personaTitle, setPersonaTitle] = useState<string>('');

  useEffect(() => {
    if (!shouldShowSidebar) return;

    // Best-effort localStorage hydration (never throws on SSR because this is client-only).
    try {
      const personaId = loadPersonaId();
      if (!personaId) {
        setPersonaTitle('');
        return;
      }

      const personaJson = loadPersona(personaId);
      const derived = derivePersonaTitleFromStoredJson(personaJson);
      setPersonaTitle(derived);
    } catch {
      setPersonaTitle('');
    }
  }, [shouldShowSidebar, safePathname]);

  const identityLabel = personaTitle || 'Current Persona';
  const identityInitials = useMemo(() => getInitials(personaTitle || 'CN'), [personaTitle]);

  const navItems: NavItem[] = useMemo(
    () => [
      { kind: 'link', href: '/ingestion', label: 'Ingestion', icon: Upload },
      { kind: 'link', href: '/personas', label: 'Personas', icon: Users },
      { kind: 'link', href: '/explore', label: 'Explore', icon: Compass },
      { kind: 'link', href: '/mindmap', label: 'Mindmap', icon: Network },
      { kind: 'dummy', label: 'Magic', icon: Sparkles, disabledReason: 'Coming soon' },
      { kind: 'dummy', label: 'Settings', icon: Settings, disabledReason: 'Coming soon' },
    ],
    []
  );

  const isActive = (href: string, exact?: boolean): boolean => {
    if (!href) return false;
    if (exact) return safePathname === href;
    return safePathname === href || safePathname.startsWith(`${href}/`);
  };

  if (!shouldShowSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-svh">
      {/* Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-30',
          'w-[72px] md:w-[92px]',
          'border-r border-white/10',
          // Transparent/violet gradient + glass
          'bg-[linear-gradient(180deg,rgba(139,92,246,0.26)_0%,rgba(31,28,42,0.55)_38%,rgba(31,28,42,0.26)_100%)]',
          'backdrop-blur-xl',
          'shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_40px_rgba(0,0,0,0.28)]',
        ].join(' ')}
        aria-label="Global sidebar navigation"
      >
        <div className="h-full flex flex-col items-center py-4">
          {/* Identity section */}
          <div className="w-full px-2">
            <Link
              href="/personas"
              className={[
                'group flex flex-col items-center gap-2',
                'rounded-2xl px-2 py-3',
                'hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50',
                'transition-colors',
              ].join(' ')}
              aria-label="Go to Personas"
              title={identityLabel}
            >
              <div
                className={[
                  'h-10 w-10 md:h-11 md:w-11',
                  'rounded-2xl',
                  'flex items-center justify-center',
                  'text-[13px] md:text-[14px] font-semibold',
                  'text-white/90',
                  'border border-violet-300/20',
                  'bg-violet-500/12',
                  'shadow-[0_10px_24px_rgba(139,92,246,0.18)]',
                ].join(' ')}
              >
                {identityInitials}
              </div>

              {/* Keep text subtle and non-disruptive; hidden on very narrow widths */}
              <div className="hidden md:block w-full text-center">
                <div className="text-[10.5px] leading-tight font-semibold text-white/78 line-clamp-2 px-1">
                  {personaTitle || 'Persona'}
                </div>
              </div>
            </Link>
          </div>

          <div className="mt-3 w-full px-2">
            <div className="h-px w-full bg-white/10" />
          </div>

          {/* Icon navigation */}
          <nav className="mt-4 flex-1 w-full px-2" aria-label="Primary">
            <ul className="flex flex-col items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.kind === 'link' ? isActive(item.href, item.exact) : false;

                const commonClasses = [
                  'relative',
                  'h-11 w-11 md:h-12 md:w-12',
                  'rounded-2xl',
                  'flex items-center justify-center',
                  'transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50',
                ].join(' ');

                const surfaceClasses = active
                  ? 'bg-violet-500/18 border border-violet-300/20 shadow-[0_14px_30px_rgba(139,92,246,0.18)]'
                  : 'bg-white/0 hover:bg-white/6 border border-transparent';

                const iconClasses = active ? 'text-white/92' : 'text-white/74 group-hover:text-white/88';

                if (item.kind === 'dummy') {
                  return (
                    <li key={item.label} className="w-full flex justify-center">
                      <button
                        type="button"
                        className={`group ${commonClasses} ${surfaceClasses} cursor-not-allowed opacity-60`}
                        aria-label={item.label}
                        title={item.disabledReason || item.label}
                        disabled
                      >
                        <Icon className={`h-[18px] w-[18px] ${iconClasses}`} />
                      </button>
                    </li>
                  );
                }

                return (
                  <li key={item.href} className="w-full flex justify-center">
                    <Link
                      href={item.href}
                      className={`group ${commonClasses} ${surfaceClasses}`}
                      aria-label={item.label}
                      title={item.label}
                    >
                      <Icon className={`h-[18px] w-[18px] ${iconClasses}`} />
                      {active && (
                        <span
                          className="absolute left-[-6px] top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-violet-400/80 shadow-[0_0_14px_rgba(139,92,246,0.65)]"
                          aria-hidden="true"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer small brand mark */}
          <div className="mt-3 w-full px-2 pb-2">
            <div className="h-px w-full bg-white/10" />
            <div className="mt-3 text-[10px] text-white/55 font-medium text-center select-none">
              CN
            </div>
          </div>
        </div>
      </aside>

      {/* Main content offset so existing UIs are not overlapped */}
      <div className="min-h-svh pl-[72px] md:pl-[92px]">{children}</div>
    </div>
  );
}
