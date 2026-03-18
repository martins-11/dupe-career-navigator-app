import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

/**
 * Serve the global background image at `/assets/purp.png`.
 *
 * Note:
 * - Next.js normally serves `/public/assets/purp.png` automatically.
 * - In the preview environment, `/assets/purp.png` was returning 404, so this route
 *   exists as a robust fallback.
 * - The current `public/assets/purp.png` file is (despite the name) actually a JPEG
 *   (JFIF header). We detect the correct content type to avoid browser/proxy issues.
 */

function detectImageContentType(bytes: Uint8Array): 'image/png' | 'image/jpeg' | 'application/octet-stream' {
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  // JPEG signature: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  return 'application/octet-stream';
}

// PUBLIC_INTERFACE
export async function GET(): Promise<Response> {
  /**
   * Returns the background image bytes with correct content type.
   * Falls back to 404 (text) rather than throwing (which would become a 500).
   */
  try {
    const filePath = path.join(process.cwd(), 'public', 'assets', 'purp.png');
    const bytes = await readFile(filePath);

    const contentType = detectImageContentType(bytes);

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache aggressively; this image is intended as a stable background asset.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    // Avoid throwing to prevent a 500 in preview; return a clear 404 instead.
    return new NextResponse('Not found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }
}
