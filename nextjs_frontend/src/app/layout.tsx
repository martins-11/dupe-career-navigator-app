import type { Metadata } from 'next';

/**
 * Global CSS entrypoint.
 *
 * IMPORTANT: This must import a single stylesheet that registers Tailwind layers
 * (`@tailwind base/components/utilities`) before importing any file that uses
 * `@layer base` (e.g. theme.css), otherwise Tailwind compilation can fail.
 */
import '@/styles/index.css';

export const metadata: Metadata = {
  title: 'Career Navigator',
  description: 'Professional persona builder UI',
};

// PUBLIC_INTERFACE
export default function RootLayout({ children }: { children: React.ReactNode }) {
  /** Root layout for the Next.js App Router application. */
  return (
    <html lang="en" className="cn-app-bg">
      <body className="cn-app-bg">{children}</body>
    </html>
  );
}
