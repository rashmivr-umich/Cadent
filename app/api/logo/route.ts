// GET /api/logo?website=https://example.com  →  { url: string | null }
// Finds a company's logo/icon from its OWN website (Moss has no logos): reads the homepage,
// looks for the icon it declares (<link rel="icon" / "apple-touch-icon">), else /favicon.ico.
// No third-party logo service. Answers are remembered so each site is only checked once.

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const cache = new Map<string, string | null>();
const TIMEOUT_MS = 4000;

const fetchWithTimeout = (url: string, init?: RequestInit) =>
  fetch(url, { ...init, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });

async function isImage(url: string) {
  try {
    const res = await fetchWithTimeout(url);
    return res.ok && (res.headers.get('content-type') ?? '').startsWith('image');
  } catch {
    return false;
  }
}

async function findIcon(site: URL): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(site.href, { headers: { Accept: 'text/html' } });
    if (res.ok) {
      const html = (await res.text()).slice(0, 200_000);
      const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
      // Prefer the bigger apple-touch-icon, then any icon.
      const ranked = [
        ...links.filter((l) => /rel=["'][^"']*apple-touch-icon/i.test(l)),
        ...links.filter((l) => /rel=["'][^"']*\bicon\b/i.test(l)),
      ];
      for (const link of ranked) {
        const href = link.match(/href=["']([^"']+)["']/i)?.[1];
        if (!href || href.startsWith('data:')) continue;
        const url = new URL(href, res.url).href;
        if (await isImage(url)) return url;
      }
    }
  } catch {
    // Site slow or down: try the standard location below.
  }
  const fallback = new URL('/favicon.ico', site).href;
  return (await isImage(fallback)) ? fallback : null;
}

export async function GET(request: Request) {
  const website = new URL(request.url).searchParams.get('website');
  let site: URL;
  try {
    site = new URL(website?.startsWith('http') ? website : `https://${website}`);
  } catch {
    return NextResponse.json({ url: null });
  }
  if (!['http:', 'https:'].includes(site.protocol)) return NextResponse.json({ url: null });

  const key = site.hostname;
  if (!cache.has(key)) cache.set(key, await findIcon(new URL(`https://${key}/`)));
  return NextResponse.json({ url: cache.get(key) ?? null });
}
