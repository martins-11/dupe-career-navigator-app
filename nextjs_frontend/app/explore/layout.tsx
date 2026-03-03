import type { Metadata, Viewport } from "next";

/**
 * Route-level metadata for the ZIP-authoritative Explore UI.
 * We keep this scoped to /explore to avoid changing the existing root app branding.
 */
export const metadata: Metadata = {
  title: "Explore Your Future Role",
  description: "Search and filter roles based on job titles, industries, required skills, and salary ranges.",
  icons: {
    icon: [
      {
        url: "/assets/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/assets/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/assets/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/assets/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D9488",
  userScalable: true,
};

// PUBLIC_INTERFACE
export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  /** Layout wrapper for the /explore route. */
  return <>{children}</>;
}
