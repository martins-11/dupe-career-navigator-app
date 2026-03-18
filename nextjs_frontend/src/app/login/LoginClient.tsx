'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type Role = 'user' | 'admin';

function GoogleIcon(props: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className={props.className}
      fill="none"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.651 32.657 29.245 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.962 3.038l5.657-5.657C34.046 6.053 29.272 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20c0-1.341-.138-2.651-.389-3.917Z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691 12.88 19.51C14.659 15.108 19 12 24 12c3.059 0 5.842 1.154 7.962 3.038l5.657-5.657C34.046 6.053 29.272 4 24 4c-7.682 0-14.345 4.326-17.694 10.691Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.17 0 9.86-1.98 13.409-5.197l-6.194-5.238C29.159 35.091 26.715 36 24 36c-5.223 0-9.612-3.316-11.27-7.946l-6.525 5.026C9.506 39.556 16.227 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a11.96 11.96 0 0 1-4.088 5.565l.003-.002 6.194 5.238C36.972 39.205 44 34 44 24c0-1.341-.138-2.651-.389-3.917Z"
      />
    </svg>
  );
}

function AppleIcon(props: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={props.className}>
      <path
        fill="currentColor"
        d="M16.365 1.43c0 1.14-.428 2.205-1.203 3.063-.852.945-2.227 1.675-3.49 1.571-.157-1.187.338-2.383 1.132-3.27.84-.93 2.318-1.62 3.561-1.364ZM20.6 17.056c-.355.823-.53 1.19-.988 1.916-.64 1.01-1.543 2.265-2.66 2.277-1.002.01-1.26-.655-2.607-.644-1.347.011-1.63.657-2.633.646-1.117-.012-1.97-1.14-2.61-2.15-1.79-2.83-1.98-6.155-.874-7.87.786-1.215 2.03-1.926 3.195-1.926 1.183 0 1.93.662 2.91.662.951 0 1.528-.664 2.899-.664 1.036 0 2.132.568 2.918 1.55-2.55 1.398-2.136 5.081.45 6.203Z"
      />
    </svg>
  );
}

const roleCopy: Record<
  Role,
  {
    title: string;
    subtitle: string;
    cta: string;
  }
> = {
  user: {
    title: 'Log in',
    subtitle: 'Access your Career Navigator workspace.',
    cta: 'Continue as User',
  },
  admin: {
    title: 'Admin log in',
    subtitle: 'Administrative access for managing the platform.',
    cta: 'Continue as Admin',
  },
};

// PUBLIC_INTERFACE
export default function LoginClient() {
  /** Dual-panel login UI with User/Admin segmented control and glassmorphism styling. */
  const [role, setRole] = useState<Role>('user');

  const heading = useMemo(() => roleCopy[role], [role]);

  return (
    <main
      className={[
        'min-h-screen w-full text-white',
        // Dark muted purple/gray gradient background from design notes
        'bg-[linear-gradient(120deg,#5b5572_0%,#4a445a_45%,#3c3947_100%)]',
      ].join(' ')}
    >
      {/* Subtle vignette + highlight */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.07),transparent_55%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(109,87,255,0.18),transparent_35%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_90%_80%,rgba(109,87,255,0.12),transparent_40%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-[1100px] items-center justify-center px-6 py-10">
        <section
          className={[
            'group relative w-full max-w-[940px] overflow-hidden rounded-2xl',
            'border border-white/10 bg-white/5 backdrop-blur-xl',
            'shadow-[0_18px_50px_rgba(0,0,0,0.45)]',
            'transition-shadow duration-300',
            // Subtle hover glow on outer card
            'hover:shadow-[0_18px_60px_rgba(0,0,0,0.52),0_0_0_1px_rgba(255,255,255,0.10),0_0_40px_rgba(109,87,255,0.18)]',
          ].join(' ')}
          aria-label="Login"
        >
          <div className="grid md:grid-cols-[0.46fr_0.54fr]">
            {/* Left media panel */}
            <div className="p-4">
              <div
                className={[
                  'relative h-[240px] overflow-hidden rounded-xl md:h-[420px]',
                  'shadow-[0_10px_24px_rgba(0,0,0,0.35)]',
                  // A purple "dunes" style gradient approximation using layered gradients
                  'bg-[radial-gradient(circle_at_30%_10%,rgba(255,255,255,0.18),transparent_45%),linear-gradient(135deg,#6a64a8_0%,#4d3f82_40%,#2f2a4b_100%)]',
                ].join(' ')}
              >
                {/* Dark tint overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18)_0%,rgba(0,0,0,0.35)_55%,rgba(0,0,0,0.45)_100%)]" />

                {/* Faux dunes */}
                <div className="absolute -bottom-20 left-[-10%] h-[220px] w-[120%] rotate-[-8deg] rounded-[100%] bg-[linear-gradient(180deg,rgba(0,0,0,0.00)_0%,rgba(0,0,0,0.35)_100%)] opacity-70" />
                <div className="absolute -bottom-24 left-[-15%] h-[240px] w-[130%] rotate-[6deg] rounded-[100%] bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(0,0,0,0.45)_100%)] opacity-50" />

                {/* Top-left logo text */}
                <div className="absolute left-4 top-3 text-[13px] font-semibold tracking-wide text-white/90">
                  AMU
                </div>

                {/* Bottom caption */}
                <div className="absolute bottom-5 left-0 right-0 px-4 text-center">
                  <div className="text-[13px] font-semibold text-white/95">
                    Capturing Moments,
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-white/75">
                    Creating Memories
                  </div>
                </div>
              </div>
            </div>

            {/* Right form panel */}
            <div className="relative px-7 pb-8 pt-7 md:px-9 md:pb-10 md:pt-8">
              {/* Top-right pill link */}
              <div className="absolute right-6 top-6 md:right-8 md:top-6">
                <Link
                  href="/"
                  className={[
                    'inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5',
                    'text-[11px] font-semibold text-white/75',
                    'transition-colors duration-200',
                    'hover:border-white/15 hover:bg-white/10 hover:text-white/85',
                    'focus:outline-none focus:ring-2 focus:ring-[#6D57FF]/40',
                  ].join(' ')}
                >
                  Back to website
                </Link>
              </div>

              <header className="pt-2">
                <h1 className="text-[20px] font-extrabold tracking-[-0.015em] text-white/95">
                  {heading.title}
                </h1>
                <p className="mt-1 text-[12px] font-medium text-white/70">
                  {heading.subtitle}{' '}
                  <span className="text-white/55">
                    (Role: {role === 'user' ? 'User' : 'Admin'})
                  </span>
                </p>

                {/* Optional helper line mirroring reference layout */}
                <p className="mt-2 text-[12px] font-medium text-white/70">
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/"
                    className="text-white/88 underline-offset-4 hover:underline"
                  >
                    Create one
                  </Link>
                </p>
              </header>

              {/* Segmented control */}
              <div className="mt-5">
                <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
                  <button
                    type="button"
                    onClick={() => setRole('user')}
                    className={[
                      'min-w-[84px] rounded-full px-4 py-1.5 text-[11px] font-semibold transition-all duration-200',
                      role === 'user'
                        ? 'bg-[rgba(109,87,255,0.35)] text-white shadow-[0_8px_20px_rgba(109,87,255,0.18)]'
                        : 'text-white/65 hover:text-white/85',
                      'focus:outline-none focus:ring-2 focus:ring-[#6D57FF]/35',
                    ].join(' ')}
                    aria-pressed={role === 'user'}
                  >
                    User
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={[
                      'min-w-[84px] rounded-full px-4 py-1.5 text-[11px] font-semibold transition-all duration-200',
                      role === 'admin'
                        ? 'bg-[rgba(109,87,255,0.35)] text-white shadow-[0_8px_20px_rgba(109,87,255,0.18)]'
                        : 'text-white/65 hover:text-white/85',
                      'focus:outline-none focus:ring-2 focus:ring-[#6D57FF]/35',
                    ].join(' ')}
                    aria-pressed={role === 'admin'}
                  >
                    Admin
                  </button>
                </div>
              </div>

              <form
                className="mt-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  // Auth is not wired in this repository yet. Keep UX smooth (no error spam).
                  // Future integration can call your auth provider here.
                }}
              >
                <div className="space-y-3">
                  <div>
                    <label htmlFor="email" className="sr-only">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Email"
                      autoComplete="email"
                      required
                      className={[
                        'h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3',
                        'text-[12px] text-white/90 placeholder:text-white/40',
                        'outline-none transition-shadow duration-200',
                        'focus:border-[#6D57FF]/60 focus:ring-4 focus:ring-[#6D57FF]/25',
                      ].join(' ')}
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="sr-only">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Password"
                      autoComplete="current-password"
                      required
                      className={[
                        'h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3',
                        'text-[12px] text-white/90 placeholder:text-white/40',
                        'outline-none transition-shadow duration-200',
                        'focus:border-[#6D57FF]/60 focus:ring-4 focus:ring-[#6D57FF]/25',
                      ].join(' ')}
                    />
                  </div>

                  {/* Admin-only extra field (kept minimal; easy to adjust to exact spec) */}
                  {role === 'admin' ? (
                    <div>
                      <label htmlFor="adminCode" className="sr-only">
                        Admin access code
                      </label>
                      <input
                        id="adminCode"
                        name="adminCode"
                        type="password"
                        placeholder="Admin access code"
                        autoComplete="one-time-code"
                        required
                        className={[
                          'h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3',
                          'text-[12px] text-white/90 placeholder:text-white/40',
                          'outline-none transition-shadow duration-200',
                          'focus:border-[#6D57FF]/60 focus:ring-4 focus:ring-[#6D57FF]/25',
                        ].join(' ')}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[11px] font-medium text-white/70">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/20 bg-white/5 text-[#6D57FF] focus:ring-[#6D57FF]/30"
                      defaultChecked
                    />
                    Remember me
                  </label>

                  <Link
                    href="/"
                    className="text-[11px] font-semibold text-white/75 underline-offset-4 hover:text-white/90 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  className={[
                    'mt-4 h-10 w-full rounded-lg bg-[#6D57FF] text-[12px] font-bold text-white',
                    'transition-all duration-200',
                    'hover:bg-[#7866ff] hover:shadow-[0_10px_30px_rgba(109,87,255,0.35)]',
                    'active:bg-[#5f4af0] active:shadow-[0_6px_18px_rgba(109,87,255,0.25)]',
                    'focus:outline-none focus:ring-4 focus:ring-[#6D57FF]/30',
                  ].join(' ')}
                >
                  {heading.cta}
                </button>

                {/* Divider */}
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <div className="text-[11px] font-medium text-white/60">
                    Or continue with
                  </div>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* Social buttons */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className={[
                      'flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5',
                      'text-[11px] font-semibold text-white/85',
                      'transition-all duration-200',
                      'hover:-translate-y-[1px] hover:border-white/15 hover:bg-white/10',
                      'focus:outline-none focus:ring-4 focus:ring-[#6D57FF]/20',
                    ].join(' ')}
                  >
                    <GoogleIcon className="h-4 w-4" />
                    Google
                  </button>

                  <button
                    type="button"
                    className={[
                      'flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5',
                      'text-[11px] font-semibold text-white/85',
                      'transition-all duration-200',
                      'hover:-translate-y-[1px] hover:border-white/15 hover:bg-white/10',
                      'focus:outline-none focus:ring-4 focus:ring-[#6D57FF]/20',
                    ].join(' ')}
                  >
                    <AppleIcon className="h-4 w-4 text-white/90" />
                    Apple
                  </button>
                </div>

                <p className="mt-5 text-[11px] font-medium text-white/55">
                  By continuing, you agree to our{' '}
                  <Link
                    href="/"
                    className="text-white/75 underline-offset-4 hover:text-white/90 hover:underline"
                  >
                    Terms & Conditions
                  </Link>
                  .
                </p>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
