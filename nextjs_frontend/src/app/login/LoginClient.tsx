'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type Role = 'user' | 'admin';

const AUTH_COOKIE_NAME = 'cn_auth';

function PersonaIcon(props: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={props.className}
      fill="none"
    >
      <path
        d="M12 12.5a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M4 20.5c1.7-3.8 5-5.7 8-5.7s6.3 1.9 8 5.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShieldIcon(props: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={props.className}
      fill="none"
    >
      <path
        d="M12 2.5 19 5.8v6.2c0 5-3.5 8.6-7 9.7-3.5-1.1-7-4.7-7-9.7V5.8L12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 12.1l1.9 1.9 3.7-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getCookieValue(cookieName: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${cookieName}=`));
  return match ? match.slice(cookieName.length + 1) : null;
}

// PUBLIC_INTERFACE
export default function LoginClient() {
  /** Dual-gate login page (User/Admin). Accepts any email/password and routes to ingestion. */
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextParam = searchParams?.get('next') ?? '/';
  const nextPath = useMemo(() => {
    // Only allow internal relative paths.
    if (!nextParam.startsWith('/')) return '/';
    if (nextParam.startsWith('/login')) return '/';
    return nextParam;
  }, [nextParam]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // If already "logged in", skip the gate and continue to ingestion.
  useEffect(() => {
    const existing = getCookieValue(AUTH_COOKIE_NAME);
    if (existing) {
      router.replace(nextPath);
    }
  }, [router, nextPath]);

  const onLogin = (role: Role) => {
    // Non-secure prototype gate: accept any email/password (client-side only).
    // Persist a lightweight cookie that middleware checks.
    const payload = {
      role,
      email: email.trim(),
      // Deliberately do NOT store password in the cookie.
      ts: Date.now(),
    };

    document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify(payload),
    )}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;

    router.replace(nextPath);
  };

  return (
    <main
      className={[
        'min-h-screen w-full text-white',
        // Deep muted navy/purple gradient background
        'bg-[radial-gradient(circle_at_20%_10%,rgba(100,255,218,0.10),transparent_35%),radial-gradient(circle_at_90%_70%,rgba(109,87,255,0.22),transparent_45%),linear-gradient(135deg,#0b1020_0%,#0a0f1a_35%,#120a1a_100%)]',
      ].join(' ')}
    >
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <section
          aria-label="Login Gate"
          className={[
            // Glassmorphism container (white ~10-15%, strong blur, subtle border)
            'w-full max-w-5xl rounded-3xl border border-white/20 bg-white/10 backdrop-blur-lg',
            'p-6 shadow-[0_18px_60px_rgba(0,0,0,0.55)] md:p-10',
          ].join(' ')}
        >
          <header className="mb-8 text-center">
            <h1 className="text-balance text-3xl font-extrabold tracking-tight text-white">
              Career Navigator
            </h1>
            <p className="mt-2 text-sm font-medium text-[#64FFDA]">
              Choose a gate and continue to document ingestion.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            {/* User Panel */}
            <div
              className={[
                'group relative rounded-3xl border border-white/20 bg-white/10 p-7 backdrop-blur-md',
                'transition-all duration-200',
                'hover:border-teal-400/50 hover:bg-white/15',
                // "Zip-Teal" glow on hover
                'hover:shadow-[0_0_0_1px_rgba(45,212,191,0.25),0_22px_60px_rgba(0,0,0,0.45),0_0_40px_rgba(100,255,218,0.18)]',
              ].join(' ')}
            >
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-teal-400/20 blur-xl transition-opacity group-hover:opacity-100" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                    <PersonaIcon className="h-6 w-6 animate-pulse text-[#64FFDA]" />
                  </div>
                </div>

                <div className="flex-1">
                  <h2 className="text-xl font-extrabold tracking-tight text-white">
                    Map Your Career Trajectory
                  </h2>
                  <p className="mt-1 text-sm font-medium text-[#64FFDA]/90">
                    Access discovery engine for AI suggestions.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <label className="block">
                  <span className="sr-only">Email</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    placeholder="Email"
                    autoComplete="email"
                    className={[
                      'h-11 w-full rounded-xl border border-white/20 bg-white/5 px-4',
                      'text-sm text-white placeholder:text-white/40',
                      'outline-none transition',
                      'focus:border-teal-400/60 focus:ring-4 focus:ring-teal-400/20',
                    ].join(' ')}
                  />
                </label>

                <label className="block">
                  <span className="sr-only">Password</span>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    required
                    placeholder="Password"
                    autoComplete="current-password"
                    className={[
                      'h-11 w-full rounded-xl border border-white/20 bg-white/5 px-4',
                      'text-sm text-white placeholder:text-white/40',
                      'outline-none transition',
                      'focus:border-teal-400/60 focus:ring-4 focus:ring-teal-400/20',
                    ].join(' ')}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => onLogin('user')}
                  className={[
                    'mt-1 inline-flex h-11 w-full items-center justify-center rounded-xl',
                    'bg-[#12d6b2] text-sm font-extrabold text-[#061219]',
                    'transition-all duration-200',
                    'hover:brightness-110 hover:shadow-[0_14px_30px_rgba(18,214,178,0.25)]',
                    'focus:outline-none focus:ring-4 focus:ring-teal-300/30',
                  ].join(' ')}
                >
                  Login as User
                </button>

                <p className="text-xs font-medium text-white/60">
                  Prototype gate: any email/password is accepted.
                </p>
              </div>
            </div>

            {/* Admin Panel */}
            <div
              className={[
                'group relative rounded-3xl border border-white/20 bg-white/10 p-7 backdrop-blur-md',
                'transition-all duration-200',
                'hover:border-teal-400/50 hover:bg-white/15',
                'hover:shadow-[0_0_0_1px_rgba(45,212,191,0.25),0_22px_60px_rgba(0,0,0,0.45),0_0_40px_rgba(100,255,218,0.18)]',
              ].join(' ')}
            >
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-violet-400/20 blur-xl transition-opacity group-hover:opacity-100" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                    <ShieldIcon className="h-6 w-6 text-white/90" />
                  </div>
                </div>

                <div className="flex-1">
                  <h2 className="text-xl font-extrabold tracking-tight text-white">
                    Manage Global Role Taxonomy
                  </h2>
                  <p className="mt-1 text-sm font-medium text-[#64FFDA]/90">
                    Access to role management &amp; system analytics.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <label className="block">
                  <span className="sr-only">Email</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    placeholder="Email"
                    autoComplete="email"
                    className={[
                      'h-11 w-full rounded-xl border border-white/20 bg-white/5 px-4',
                      'text-sm text-white placeholder:text-white/40',
                      'outline-none transition',
                      'focus:border-violet-400/60 focus:ring-4 focus:ring-violet-400/20',
                    ].join(' ')}
                  />
                </label>

                <label className="block">
                  <span className="sr-only">Password</span>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    required
                    placeholder="Password"
                    autoComplete="current-password"
                    className={[
                      'h-11 w-full rounded-xl border border-white/20 bg-white/5 px-4',
                      'text-sm text-white placeholder:text-white/40',
                      'outline-none transition',
                      'focus:border-violet-400/60 focus:ring-4 focus:ring-violet-400/20',
                    ].join(' ')}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => onLogin('admin')}
                  className={[
                    'mt-1 inline-flex h-11 w-full items-center justify-center rounded-xl',
                    'bg-white/10 text-sm font-extrabold text-white',
                    'transition-all duration-200',
                    // Deep violet hover effect (per notes)
                    'hover:bg-[#6D57FF] hover:shadow-[0_14px_34px_rgba(109,87,255,0.28)]',
                    'focus:outline-none focus:ring-4 focus:ring-violet-400/30',
                  ].join(' ')}
                >
                  Login as Admin
                </button>

                <p className="text-xs font-medium text-white/60">
                  Prototype gate: any email/password is accepted.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
