'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  Settings,
  Store,
  Upload,
  type LucideIcon,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

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

const SIDEBAR_EXPANDED_STORAGE_KEY = 'cn.sidebar.expanded';

const DUMMY_PROFILE = {
  name: 'Rossini B',
  initials: 'RB',
} as const;

// PUBLIC_INTERFACE
export default function GlobalSidebarLayout({ children }: { children: React.ReactNode }) {
  /**
   * Global app chrome wrapper:
   * - Fixed, transparent/violet gradient sidebar (brand + icon navigation).
   * - Adds an expand/collapse toggle that reveals nav text labels next to icons.
   *
   * UI updates (per request):
   * - Sidebar brand text should use a dark purple.
   * - Add a dummy profile initials dropdown at the bottom of the sidebar.
   */
  const pathname = usePathname();
  const safePathname = pathname ?? '';

  // Keep login uncluttered / avoid disrupting its bespoke layout.
  const shouldShowSidebar = safePathname !== '/login';

  // Sidebar label visibility (persisted).
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!shouldShowSidebar) return;

    // Restore user's preference; default is collapsed (matches current design).
    try {
      const stored = localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY);
      setIsSidebarExpanded(stored === '1');
    } catch {
      setIsSidebarExpanded(false);
    }
  }, [shouldShowSidebar]);

  useEffect(() => {
    if (!shouldShowSidebar) return;

    // Persist preference across navigations.
    try {
      localStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, isSidebarExpanded ? '1' : '0');
    } catch {
      // ignore storage failures
    }
  }, [shouldShowSidebar, isSidebarExpanded]);

  const navItems: NavItem[] = useMemo(
    () => [
      { kind: 'link', href: '/ingestion', label: 'Ingestion', icon: Upload },
      { kind: 'link', href: '/skill-validation', label: 'Skill Validation', icon: BadgeCheck },
      { kind: 'link', href: '/explore', label: 'Explore', icon: Compass },
      { kind: 'link', href: '/market-place', label: 'Market Place', icon: Store },
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

  // Keep existing sizes intact when collapsed; expand just enough to fit labels.
  const sidebarWidthClass = isSidebarExpanded ? 'w-[240px] md:w-[280px]' : 'w-[72px] md:w-[92px]';

  const mainOffsetClass = isSidebarExpanded ? 'pl-[240px] md:pl-[280px]' : 'pl-[72px] md:pl-[92px]';

  const navListAlign = isSidebarExpanded ? 'items-stretch' : 'items-center';

  return (
    <div className="min-h-svh">
      {/* Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-30',
          sidebarWidthClass,
          'border-r border-white/10',
          // Transparent/violet gradient + glass
          'bg-[linear-gradient(180deg,rgba(139,92,246,0.26)_0%,rgba(31,28,42,0.55)_38%,rgba(31,28,42,0.26)_100%)]',
          'backdrop-blur-xl',
          'shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_40px_rgba(0,0,0,0.28)]',
          'transition-[width] duration-200 ease-out',
        ].join(' ')}
        aria-label="Global sidebar navigation"
      >
        <div
          className={[
            'h-full flex flex-col py-4',
            // Preserve centered layout when collapsed; allow full-width items when expanded.
            isSidebarExpanded ? 'items-stretch' : 'items-center',
          ].join(' ')}
        >
          {/* Brand section */}
          <div className="w-full px-2">
            <Link
              href="/ingestion"
              className={[
                'group flex items-center',
                isSidebarExpanded ? 'justify-start gap-4 px-3' : 'justify-center px-0',
                'rounded-3xl py-4',
                // Light surface so dark-purple brand text is readable (requested).
                'bg-white/90 hover:bg-white/95',
                'border border-white/30',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/55',
                'transition-colors',
              ].join(' ')}
              aria-label="Career Navigator Home"
              title="Career Navigator"
            >
              <div
                className={[
                  'h-12 w-12 md:h-[52px] md:w-[52px]',
                  'rounded-3xl',
                  'flex items-center justify-center',
                  'border border-violet-900/10',
                  'bg-violet-500/18',
                  'shadow-[0_16px_34px_rgba(139,92,246,0.24)]',
                ].join(' ')}
              >
                <Compass strokeWidth={2.6} className="h-[22px] w-[22px] text-violet-950" />
              </div>

              {isSidebarExpanded && (
                <div className="min-w-0">
                  <div className="text-[18px] md:text-[20px] font-extrabold text-[#2B1B5A] tracking-tight truncate">
                    Career Navigator
                  </div>
                  <div className="text-[11.5px] font-medium text-slate-600 truncate">Persona Studio</div>
                </div>
              )}
            </Link>
          </div>

          <div className="mt-3 w-full px-2">
            <div className="h-px w-full bg-white/10" />
          </div>

          {/* Expand/collapse toggle */}
          <div className="mt-3 w-full px-2">
            <button
              type="button"
              onClick={() => setIsSidebarExpanded((v) => !v)}
              className={[
                'group relative',
                'rounded-2xl',
                isSidebarExpanded ? 'h-10 md:h-11 w-full px-3' : 'h-11 w-11 md:h-12 md:w-12',
                'flex items-center',
                isSidebarExpanded ? 'justify-between' : 'justify-center',
                'border border-transparent',
                'bg-white/0 hover:bg-white/6',
                'transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50',
              ].join(' ')}
              aria-label={isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-pressed={isSidebarExpanded}
              title={isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <span className="flex items-center gap-2">
                {isSidebarExpanded ? (
                  <ChevronLeft className="h-[18px] w-[18px] text-white/78 group-hover:text-white/92" />
                ) : (
                  <ChevronRight className="h-[18px] w-[18px] text-white/78 group-hover:text-white/92" />
                )}

                {isSidebarExpanded && (
                  <span className="text-[12.5px] font-semibold text-white/78 group-hover:text-white/92">
                    {isSidebarExpanded ? 'Collapse' : 'Expand'}
                  </span>
                )}
              </span>

              {/* Keep alignment consistent without adding visual noise */}
              {isSidebarExpanded && <span aria-hidden="true" className="w-2" />}
            </button>
          </div>

          {/* Icon navigation */}
          <nav className="mt-4 flex-1 w-full px-2" aria-label="Primary">
            <ul className={['flex flex-col gap-2', navListAlign].join(' ')}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.kind === 'link' ? isActive(item.href, item.exact) : false;

                const commonClasses = [
                  'group relative',
                  'rounded-2xl',
                  'flex items-center',
                  'transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50',
                  isSidebarExpanded
                    ? 'h-11 md:h-12 w-full px-3 gap-3 justify-start'
                    : 'h-11 w-11 md:h-12 md:w-12 justify-center',
                ].join(' ');

                const surfaceClasses = active
                  ? 'bg-violet-500/18 border border-violet-300/20 shadow-[0_14px_30px_rgba(139,92,246,0.18)]'
                  : 'bg-white/0 hover:bg-white/6 border border-transparent';

                const iconClasses = active ? 'text-white/92' : 'text-white/74 group-hover:text-white/88';
                const labelClasses = active ? 'text-white/92' : 'text-white/78 group-hover:text-white/92';

                if (item.kind === 'dummy') {
                  return (
                    <li
                      key={item.label}
                      className={['w-full flex', isSidebarExpanded ? 'justify-stretch' : 'justify-center'].join(
                        ' '
                      )}
                    >
                      <button
                        type="button"
                        className={`${commonClasses} ${surfaceClasses} cursor-not-allowed opacity-60`}
                        aria-label={item.label}
                        title={item.disabledReason || item.label}
                        disabled
                      >
                        <Icon className={`h-[18px] w-[18px] ${iconClasses}`} />
                        {isSidebarExpanded && (
                          <span className={`text-[13px] md:text-[14px] font-semibold ${labelClasses}`}>
                            {item.label}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                }

                return (
                  <li
                    key={item.href}
                    className={['w-full flex', isSidebarExpanded ? 'justify-stretch' : 'justify-center'].join(' ')}
                  >
                    <Link href={item.href} className={`${commonClasses} ${surfaceClasses}`} aria-label={item.label} title={item.label}>
                      <Icon className={`h-[18px] w-[18px] ${iconClasses}`} />

                      {isSidebarExpanded && (
                        <span className={`text-[13px] md:text-[14px] font-semibold ${labelClasses}`}>
                          {item.label}
                        </span>
                      )}

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

          {/* Footer: Dummy profile initials dropdown */}
          <div className="mt-3 w-full px-2 pb-2">
            <div className="h-px w-full bg-white/10" />

            <div className="mt-3">
              <DropdownMenu open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={[
                      'group w-full rounded-2xl',
                      'flex items-center',
                      isSidebarExpanded ? 'justify-between gap-3 px-3 py-2' : 'justify-center h-11 w-11 md:h-12 md:w-12 p-0 mx-auto',
                      'bg-white/0 hover:bg-white/6',
                      'transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50',
                    ].join(' ')}
                    aria-label="Profile menu"
                    title={DUMMY_PROFILE.name}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 border border-white/15 bg-white/5">
                        <AvatarFallback className="bg-white/10 text-white font-bold text-sm">
                          {DUMMY_PROFILE.initials}
                        </AvatarFallback>
                      </Avatar>

                      {isSidebarExpanded && (
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold text-white/90 truncate">
                            {DUMMY_PROFILE.name}
                          </span>
                          <span className="block text-[11px] font-medium text-white/60 truncate">
                            Profile
                          </span>
                        </span>
                      )}
                    </span>

                    {isSidebarExpanded && (
                      <span className="text-white/70 group-hover:text-white/90">
                        {profileMenuOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent side="top" align="start" className="w-64">
                  <DropdownMenuLabel className="text-sm font-semibold">{DUMMY_PROFILE.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                    Dummy profile menu (placeholder)
                  </DropdownMenuLabel>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content offset so existing UIs are not overlapped */}
      <div className={`min-h-svh ${mainOffsetClass} transition-[padding] duration-200 ease-out`}>{children}</div>
    </div>
  );
}
