import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
/**
 * Global CSS entrypoint.
 *
 * IMPORTANT: This must import a single stylesheet that registers Tailwind layers
 * (`@tailwind base/components/utilities`) before importing any file that uses
 * `@layer base` (e.g. theme.css), otherwise Tailwind compilation can fail.
 */
import '@/styles/index.css';

import GlobalSidebarLayout from '@/app/components/layout/GlobalSidebarLayout';

const montserrat = Montserrat({
  subsets: ['latin'],
  // Provide a broad range so existing font-weight usage across the app renders correctly.
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-montserrat',
});

export const metadata: Metadata = {
  title: 'Career Navigator',
  description: 'Professional persona builder UI',
};

// PUBLIC_INTERFACE
export default function RootLayout({ children }: { children: React.ReactNode }) {
  /** Root layout for the Next.js App Router application. */
  return (
    <html lang="en" className={montserrat.className}>
      <body className="cn-app-bg">
        <GlobalSidebarLayout>{children}</GlobalSidebarLayout>
      </body>
    </html>
  );
}
