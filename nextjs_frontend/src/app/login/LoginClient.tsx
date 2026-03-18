'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

type Role = 'user' | 'admin';

const AUTH_COOKIE_NAME = 'cn_auth';

function clampNextPath(nextParam: string | null): string {
  /**
   * Ensures we only redirect to safe internal paths and avoids redirect loops
   * now that `/` always redirects to `/login`.
   */
  const raw = (nextParam ?? '').trim();
  if (!raw) return '/ingestion';
  if (!raw.startsWith('/')) return '/ingestion';
  if (raw === '/' || raw.startsWith('/login')) return '/ingestion';
  return raw;
}

function setAuthCookie(payload: { role: Role; email: string }) {
  // Non-secure prototype gate: accept any email/password (client-side only).
  // Deliberately do NOT store password in the cookie.
  const value = encodeURIComponent(JSON.stringify({ ...payload, ts: Date.now() }));
  document.cookie = `${AUTH_COOKIE_NAME}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function MountainPanelArt() {
  /**
   * Palette-constrained illustration:
   * - Uses only ink/slate/primary/white/muted (with opacity).
   */
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 560 520"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--cn-primary)" />
          <stop offset="60%" stopColor="var(--cn-slate)" />
          <stop offset="100%" stopColor="var(--cn-ink)" />
        </linearGradient>

        <linearGradient id="ridge" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--cn-primary)" stopOpacity="0.45" />
          <stop offset="70%" stopColor="var(--cn-slate)" stopOpacity="0.88" />
          <stop offset="100%" stopColor="var(--cn-ink)" stopOpacity="1" />
        </linearGradient>

        <linearGradient id="ridge2" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--cn-primary)" stopOpacity="0.22" />
          <stop offset="55%" stopColor="var(--cn-ink)" stopOpacity="0.98" />
        </linearGradient>

        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 .55 0"
          />
        </filter>
      </defs>

      {/* sky */}
      <rect width="560" height="520" fill="url(#sky)" />

      {/* faint glow */}
      <circle cx="140" cy="110" r="95" fill="var(--cn-white)" opacity="0.10" filter="url(#soft)" />
      <circle cx="420" cy="175" r="120" fill="var(--cn-primary)" opacity="0.12" filter="url(#soft)" />

      {/* far ridge */}
      <path
        d="M-10 300 C 80 250, 160 245, 240 285 C 315 320, 370 315, 460 270 C 520 240, 590 250, 590 250 L 590 520 L -10 520 Z"
        fill="url(#ridge2)"
      />

      {/* main ridge */}
      <path
        d="M-10 340 C 70 310, 170 265, 260 300 C 340 332, 420 370, 520 315 C 590 276, 620 285, 620 285 L 620 520 L -10 520 Z"
        fill="url(#ridge)"
      />

      {/* dark foreground */}
      <path
        d="M-10 395 C 110 370, 190 350, 280 380 C 380 412, 470 452, 610 410 L 610 520 L -10 520 Z"
        fill="var(--cn-ink)"
        opacity="0.92"
      />
    </svg>
  );
}

function GoogleIcon(props: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={props.className} fill="none">
      <path
        d="M21.6 12.23c0-.68-.06-1.18-.18-1.7H12v3.24h5.53c-.11.8-.71 2.01-2.02 2.82l-.02.11 2.98 2.24.2.02c1.85-1.66 2.93-4.1 2.93-6.75Z"
        fill="currentColor"
        opacity="0.92"
      />
      <path
        d="M12 22c2.7 0 4.97-.86 6.63-2.35l-3.16-2.37c-.85.58-1.99.99-3.47.99-2.65 0-4.9-1.66-5.7-3.96l-.11.01-3.09 2.29-.04.1C4.7 19.65 8.08 22 12 22Z"
        fill="currentColor"
        opacity="0.72"
      />
      <path
        d="M6.3 14.31a6.2 6.2 0 0 1 0-4.62l-.01-.1-3.13-2.33-.1.05A9.8 9.8 0 0 0 2 12c0 1.58.38 3.07 1.06 4.39l3.24-2.08Z"
        fill="currentColor"
        opacity="0.55"
      />
      <path
        d="M12 5.73c1.87 0 3.13.79 3.84 1.45l2.8-2.67C16.96 2.93 14.7 2 12 2 8.08 2 4.7 4.35 3.06 7.31l3.24 2.39C7.1 7.4 9.35 5.73 12 5.73Z"
        fill="currentColor"
        opacity="0.72"
      />
    </svg>
  );
}

function AppleIcon(props: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={props.className} fill="currentColor">
      <path d="M16.63 13.18c.02 2.15 1.9 2.86 1.92 2.87-.01.05-.3 1.03-1 2.03-.6.86-1.22 1.71-2.2 1.73-.96.02-1.27-.55-2.37-.55-1.1 0-1.45.53-2.36.57-.94.04-1.65-.9-2.26-1.76-1.25-1.74-2.2-4.92-.92-7.06.64-1.05 1.79-1.71 3.04-1.73.95-.02 1.85.6 2.36.6.5 0 1.46-.74 2.46-.63.42.02 1.6.16 2.36 1.2-.06.04-1.41.8-1.4 2.38Zm-1.62-4.99c.5-.58.84-1.38.75-2.18-.72.03-1.59.46-2.1 1.04-.46.52-.86 1.34-.75 2.12.8.06 1.6-.4 2.1-.98Z" />
    </svg>
  );
}

// PUBLIC_INTERFACE
export default function LoginClient() {
  /** Login screen (prototype): single credential form + role switch (User/Admin), redirects to ingestion after setting cookie. */
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => clampNextPath(searchParams?.get('next') ?? null), [searchParams]);

  const [role, setRole] = useState<Role>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    setAuthCookie({ role, email: email.trim() });
    void remember;

    router.replace(nextPath);
  };

  return (
    <main
      className="min-h-screen w-full px-5 py-10"
      style={{
        background: `linear-gradient(180deg, rgba(var(--cn-primary-rgb), 0.12) 0%, var(--cn-ink) 60%, var(--cn-ink) 100%)`,
        color: 'var(--cn-white)',
      }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[980px] items-center justify-center">
        <section
          aria-label="Login"
          className="w-full overflow-hidden rounded-2xl shadow-[0_28px_70px_rgba(var(--cn-ink-rgb),0.55)] ring-1"
          style={{
            background: 'rgba(var(--cn-white-rgb), 0.10)',
            borderColor: 'rgba(var(--cn-white-rgb), 0.14)',
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left panel (visual) */}
            <div className="relative hidden min-h-[520px] md:block">
              <MountainPanelArt />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to bottom, rgba(var(--cn-ink-rgb), 0.10), transparent, rgba(var(--cn-ink-rgb), 0.40))',
                }}
              />

              <div className="relative flex h-full flex-col p-8">
                <div className="flex items-start justify-between">
                  <div className="text-sm font-semibold tracking-wide" style={{ color: 'rgba(var(--cn-white-rgb), 0.92)' }}>
                    Career Navigator
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="max-w-[260px]">
                    <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--cn-white)' }}>
                      Build a career that compounds.
                      <br />
                      <span style={{ color: 'rgba(var(--cn-white-rgb), 0.70)' }}>
                        Turn your experience into your next opportunity.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right panel (form) */}
            <div className="flex min-h-[520px] flex-col justify-center px-7 py-10 md:px-10">
              <header className="mb-7">
                <h1 className="text-2xl font-semibold leading-tight" style={{ color: 'var(--cn-white)' }}>
                  Create an account
                </h1>
                <p className="mt-2 text-sm" style={{ color: 'rgba(var(--cn-white-rgb), 0.60)' }}>
                  Already have an account?{' '}
                  <a
                    href="/login"
                    className="font-medium transition"
                    style={{ color: 'rgba(var(--cn-white-rgb), 0.80)' }}
                    onClick={(e) => e.preventDefault()}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cn-white)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(var(--cn-white-rgb), 0.80)')}
                  >
                    Log in
                  </a>
                </p>
              </header>

              {/* Role switch */}
              <div
                className="mb-5 inline-flex w-full rounded-lg p-1 ring-1"
                role="tablist"
                aria-label="Role"
                style={{
                  background: 'rgba(var(--cn-white-rgb), 0.05)',
                  borderColor: 'rgba(var(--cn-white-rgb), 0.12)',
                }}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={role === 'user'}
                  className={['h-9 flex-1 rounded-md text-sm font-medium transition', role === 'user' ? 'shadow-sm' : ''].join(' ')}
                  style={{
                    background: role === 'user' ? 'rgba(var(--cn-slate-rgb), 0.92)' : 'transparent',
                    color: role === 'user' ? 'var(--cn-white)' : 'rgba(var(--cn-white-rgb), 0.70)',
                  }}
                  onMouseEnter={(e) => {
                    if (role !== 'user') e.currentTarget.style.color = 'rgba(var(--cn-white-rgb), 0.90)';
                  }}
                  onMouseLeave={(e) => {
                    if (role !== 'user') e.currentTarget.style.color = 'rgba(var(--cn-white-rgb), 0.70)';
                  }}
                  onClick={() => setRole('user')}
                >
                  User
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={role === 'admin'}
                  className={['h-9 flex-1 rounded-md text-sm font-medium transition', role === 'admin' ? 'shadow-sm' : ''].join(' ')}
                  style={{
                    background: role === 'admin' ? 'rgba(var(--cn-slate-rgb), 0.92)' : 'transparent',
                    color: role === 'admin' ? 'var(--cn-white)' : 'rgba(var(--cn-white-rgb), 0.70)',
                  }}
                  onMouseEnter={(e) => {
                    if (role !== 'admin') e.currentTarget.style.color = 'rgba(var(--cn-white-rgb), 0.90)';
                  }}
                  onMouseLeave={(e) => {
                    if (role !== 'admin') e.currentTarget.style.color = 'rgba(var(--cn-white-rgb), 0.70)';
                  }}
                  onClick={() => setRole('admin')}
                >
                  Admin
                </button>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <label className="block">
                  <span className="sr-only">Email</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    placeholder="Email"
                    autoComplete="email"
                    className="h-11 w-full rounded-lg border px-4 text-sm outline-none transition"
                    style={{
                      borderColor: 'rgba(var(--cn-white-rgb), 0.12)',
                      background: 'rgba(var(--cn-white-rgb), 0.05)',
                      color: 'var(--cn-white)',
                    }}
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
                    className="h-11 w-full rounded-lg border px-4 text-sm outline-none transition"
                    style={{
                      borderColor: 'rgba(var(--cn-white-rgb), 0.12)',
                      background: 'rgba(var(--cn-white-rgb), 0.05)',
                      color: 'var(--cn-white)',
                    }}
                  />
                </label>

                <div className="flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-2 text-xs" style={{ color: 'rgba(var(--cn-white-rgb), 0.70)' }}>
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded focus:ring-2"
                      style={{
                        borderColor: 'rgba(var(--cn-white-rgb), 0.20)',
                        background: 'rgba(var(--cn-white-rgb), 0.05)',
                        color: 'var(--cn-primary)',
                      }}
                    />
                    Remember me
                  </label>

                  <a
                    href="/login"
                    className="text-xs font-medium transition"
                    style={{ color: 'rgba(var(--cn-white-rgb), 0.70)' }}
                    onClick={(e) => e.preventDefault()}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(var(--cn-white-rgb), 0.90)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(var(--cn-white-rgb), 0.70)')}
                  >
                    Forgot your password?
                  </a>
                </div>

                <button
                  type="submit"
                  className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold transition focus:outline-none focus:ring-4"
                  style={{
                    background: 'var(--cn-primary)',
                    color: 'var(--cn-white)',
                    boxShadow: '0 10px 28px rgba(var(--cn-primary-rgb), 0.22)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--cn-primary)')}
                >
                  Create account
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" style={{ borderColor: 'rgba(var(--cn-white-rgb), 0.12)' }} />
                  </div>
                  <div className="relative flex justify-center">
                    <span
                      className="px-3 text-xs"
                      style={{
                        background: 'rgba(var(--cn-white-rgb), 0.10)',
                        color: 'rgba(var(--cn-white-rgb), 0.55)',
                      }}
                    >
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium ring-1 transition"
                    style={{
                      background: 'rgba(var(--cn-white-rgb), 0.05)',
                      color: 'rgba(var(--cn-white-rgb), 0.88)',
                      borderColor: 'rgba(var(--cn-white-rgb), 0.12)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--cn-white-rgb), 0.10)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(var(--cn-white-rgb), 0.05)')}
                  >
                    <GoogleIcon className="h-4 w-4" />
                    Google
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium ring-1 transition"
                    style={{
                      background: 'rgba(var(--cn-white-rgb), 0.05)',
                      color: 'rgba(var(--cn-white-rgb), 0.88)',
                      borderColor: 'rgba(var(--cn-white-rgb), 0.12)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--cn-white-rgb), 0.10)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(var(--cn-white-rgb), 0.05)')}
                  >
                    <AppleIcon className="h-4 w-4" />
                    Apple
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
