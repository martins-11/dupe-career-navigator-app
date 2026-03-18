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

function DunesPanelArt() {
  /**
   * Reference-matching abstract "purple dunes" panel art.
   * Intentionally uses local (non-global) colors so the /login page does not drift
   * when the application's global palette/theme variables change.
   */
  return (
    <svg aria-hidden="true" viewBox="0 0 560 520" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="cnLoginSky" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#6D6AD2" />
          <stop offset="55%" stopColor="#3A3578" />
          <stop offset="100%" stopColor="#1F1C2A" />
        </linearGradient>

        <linearGradient id="cnLoginDune1" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#6B5BDA" stopOpacity="0.35" />
          <stop offset="55%" stopColor="#2F2C3A" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#1F1C2A" stopOpacity="1" />
        </linearGradient>

        <linearGradient id="cnLoginDune2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#B7AEFF" stopOpacity="0.16" />
          <stop offset="55%" stopColor="#2F2C3A" stopOpacity="0.90" />
          <stop offset="100%" stopColor="#24212F" stopOpacity="1" />
        </linearGradient>

        <filter id="cnLoginGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
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

      <rect width="560" height="520" fill="url(#cnLoginSky)" />

      {/* soft highlights */}
      <circle cx="150" cy="130" r="110" fill="#FFFFFF" opacity="0.09" filter="url(#cnLoginGlow)" />
      <circle cx="420" cy="190" r="130" fill="#6B5BDA" opacity="0.14" filter="url(#cnLoginGlow)" />

      {/* dunes */}
      <path
        d="M-10 300 C 90 250, 180 250, 250 285 C 330 325, 400 320, 470 275 C 525 242, 600 252, 600 252 L 600 520 L -10 520 Z"
        fill="url(#cnLoginDune1)"
      />
      <path
        d="M-10 350 C 80 320, 170 270, 260 304 C 340 336, 420 385, 520 330 C 585 294, 620 304, 620 304 L 620 520 L -10 520 Z"
        fill="url(#cnLoginDune2)"
      />
      <path
        d="M-10 400 C 110 370, 200 360, 285 386 C 380 416, 470 465, 620 420 L 620 520 L -10 520 Z"
        fill="#1E1C24"
        opacity="0.92"
      />
    </svg>
  );
}

function GoogleIcon(props: { className?: string }) {
  /** Multi-color Google mark (reference-like). */
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={props.className}>
      <path
        d="M21.6 12.23c0-.68-.06-1.18-.18-1.7H12v3.24h5.53c-.11.8-.71 2.01-2.02 2.82v.01l3.16 2.35c1.85-1.66 2.93-4.1 2.93-6.75Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.97-.86 6.63-2.35l-3.16-2.37c-.85.58-1.99.99-3.47.99-2.65 0-4.9-1.66-5.7-3.96l-3.2 2.39C4.7 19.65 8.08 22 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.3 14.31a6.2 6.2 0 0 1 0-4.62L3.06 7.31A9.86 9.86 0 0 0 2 12c0 1.58.38 3.07 1.06 4.39l3.24-2.08Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.73c1.87 0 3.13.79 3.84 1.45l2.8-2.67C16.96 2.93 14.7 2 12 2 8.08 2 4.7 4.35 3.06 7.31l3.24 2.39C7.1 7.4 9.35 5.73 12 5.73Z"
        fill="#EA4335"
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
  /** Login screen (prototype): accepts any email/password, sets cn_auth cookie (role+email), then redirects to `next` or /ingestion. */
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => clampNextPath(searchParams?.get('next') ?? null), [searchParams]);

  const [role, setRole] = useState<Role>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(true);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    setAuthCookie({ role, email: email.trim() });

    // UI-only field, not used by the prototype auth gate.
    void password;
    void agreed;

    router.replace(nextPath);
  };

  return (
    <main className="relative min-h-screen w-full px-5 py-10 text-white">
      {/* Page background (reference-matching; isolated from global theme palette) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          // Keep a subtle login scrim, but allow the global purp.png background to show through.
          background:
            'radial-gradient(circle at 50% 26%, rgba(255,255,255,0.08), transparent 55%), linear-gradient(135deg, rgba(109,104,123,0.28) 0%, rgba(91,85,114,0.28) 46%, rgba(60,57,71,0.28) 100%)',
        }}
      />

      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[980px] items-center justify-center">
        <section
          aria-label="Login"
          className="w-full overflow-hidden rounded-2xl border shadow-[0_16px_40px_rgba(10,8,20,0.45)]"
          style={{
            backgroundColor: '#2F2C3A',
            borderColor: '#4A465C',
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-[0.46fr_0.54fr]">
            {/* Left panel (media) */}
            <div className="p-4">
              <div className="relative h-[260px] overflow-hidden rounded-xl shadow-[0_10px_24px_rgba(10,8,20,0.35)] md:h-[440px]">
                <DunesPanelArt />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(to bottom, rgba(0,0,0,0.10), rgba(0,0,0,0.00) 55%, rgba(0,0,0,0.38))',
                  }}
                />

                <div className="relative flex h-full flex-col p-4">
                  <div className="text-xs font-semibold tracking-wide text-white/90">Career Navigator</div>

                  {/* Keep the career/success-oriented quote copy (requested), while restoring colors */}
                  <div className="mt-auto pb-1 text-center">
                    <p className="text-sm font-semibold leading-snug text-white/95">
                      Chart Your Career,
                      <br />
                      <span className="text-xs font-medium text-white/75">Create Your Success</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right panel (form) */}
            <div className="flex flex-col px-7 py-9 md:px-9">
              <div className="flex items-start justify-end">
                <a
                  href="/"
                  className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors"
                  style={{
                    backgroundColor: '#24212F',
                    borderColor: '#4A465C',
                    color: 'rgba(255,255,255,0.72)',
                  }}
                  onClick={(e) => e.preventDefault()}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#2A2736';
                    (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.86)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#24212F';
                    (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.72)';
                  }}
                >
                  Back to website
                </a>
              </div>

              <header className="mt-6">
                <h1 className="text-[20px] font-bold leading-tight text-white/95">Create an account</h1>
                <p className="mt-2 text-[12px] font-medium text-white/70">
                  Already have an account?{' '}
                  <a
                    href="/login"
                    className="font-semibold text-white/85 hover:underline"
                    onClick={(e) => e.preventDefault()}
                  >
                    Log in
                  </a>
                </p>
              </header>

              {/* Role switch (segmented control) */}
              <div className="mt-5">
                <div
                  className="inline-flex w-full rounded-full border p-1"
                  role="tablist"
                  aria-label="Role"
                  style={{
                    backgroundColor: '#24212F',
                    borderColor: '#4A465C',
                  }}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={role === 'user'}
                    className={[
                      'h-8 flex-1 rounded-full text-[11px] font-semibold transition',
                      role === 'user' ? 'text-white' : 'text-white/65 hover:text-white/85',
                    ].join(' ')}
                    style={{
                      background: role === 'user' ? '#3A3748' : 'transparent',
                    }}
                    onClick={() => setRole('user')}
                  >
                    User
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={role === 'admin'}
                    className={[
                      'h-8 flex-1 rounded-full text-[11px] font-semibold transition',
                      role === 'admin' ? 'text-white' : 'text-white/65 hover:text-white/85',
                    ].join(' ')}
                    style={{
                      background: role === 'admin' ? '#3A3748' : 'transparent',
                    }}
                    onClick={() => setRole('admin')}
                  >
                    Admin
                  </button>
                </div>
              </div>

              <form onSubmit={submit} className="mt-5 space-y-3">
                <label className="block">
                  <span className="sr-only">Email</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    placeholder="Email"
                    autoComplete="email"
                    className="h-10 w-full rounded-lg border px-4 text-[12px] outline-none transition"
                    style={{
                      backgroundColor: '#3A3748',
                      borderColor: '#4A465C',
                      color: 'rgba(255,255,255,0.90)',
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
                    className="h-10 w-full rounded-lg border px-4 text-[12px] outline-none transition"
                    style={{
                      backgroundColor: '#3A3748',
                      borderColor: '#4A465C',
                      color: 'rgba(255,255,255,0.90)',
                    }}
                  />
                </label>

                {/* Focus styling (kept local, without changing behavior) */}
                <style jsx>{`
                  input::placeholder {
                    color: rgba(255, 255, 255, 0.55);
                  }
                  input:focus {
                    border-color: #6b5bda !important;
                    box-shadow: 0 0 0 4px rgba(107, 91, 218, 0.25);
                  }
                `}</style>

                <div className="pt-1">
                  <label className="inline-flex items-center gap-2 text-[11px] font-medium text-white/70">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="h-4 w-4 rounded border text-[#6B5BDA]"
                      style={{
                        backgroundColor: '#24212F',
                        borderColor: 'rgba(255,255,255,0.22)',
                      }}
                    />
                    I agree to the{' '}
                    <a href="/login" className="font-semibold text-white/85 hover:underline" onClick={(e) => e.preventDefault()}>
                      Terms &amp; Conditions
                    </a>
                  </label>
                </div>

                <button
                  type="submit"
                  className="mt-1 inline-flex h-10 w-full items-center justify-center rounded-lg text-[12px] font-bold text-white transition focus:outline-none"
                  style={{
                    background: '#6B5BDA',
                    boxShadow: '0 10px 30px rgba(107, 91, 218, 0.25)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#7868E6';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 10px 30px rgba(107, 91, 218, 0.35)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#6B5BDA';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 10px 30px rgba(107, 91, 218, 0.25)';
                  }}
                >
                  Create account
                </button>

                {/* Divider */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" style={{ borderColor: 'rgba(255,255,255,0.10)' }} />
                  </div>
                  <div className="relative flex justify-center">
                    <span
                      className="px-3 text-[11px] font-medium"
                      style={{
                        backgroundColor: '#2F2C3A',
                        color: 'rgba(255,255,255,0.60)',
                      }}
                    >
                      Or continue with
                    </span>
                  </div>
                </div>

                {/* Social buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border text-[11px] font-semibold transition hover:-translate-y-[1px]"
                    style={{
                      backgroundColor: '#24212F',
                      borderColor: '#4A465C',
                      color: 'rgba(255,255,255,0.85)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2A2736';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#24212F';
                    }}
                  >
                    <GoogleIcon className="h-4 w-4" />
                    Google
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border text-[11px] font-semibold transition hover:-translate-y-[1px]"
                    style={{
                      backgroundColor: '#24212F',
                      borderColor: '#4A465C',
                      color: 'rgba(255,255,255,0.85)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2A2736';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#24212F';
                    }}
                  >
                    <AppleIcon className="h-4 w-4 text-white" />
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
