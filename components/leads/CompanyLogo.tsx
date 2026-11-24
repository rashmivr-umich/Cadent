'use client';

// Company logo: Moss has no logos, so we ask /api/logo for the icon the company's own website
// declares (only if SAM.gov lists a website), and show the company's initials otherwise.

import { useEffect, useState } from 'react';
import { Avatar } from '@coinbase/cds-web/media';

// Remember answers across rows and pages so each website is only looked up once per visit.
const known = new Map<string, Promise<string | null>>();

function lookupLogo(website: string) {
  if (!known.has(website)) {
    known.set(
      website,
      fetch(`/api/logo?website=${encodeURIComponent(website)}`)
        .then((res) => (res.ok ? res.json() : { url: null }))
        .then((body) => (body.url as string | null) ?? null)
        .catch(() => null),
    );
  }
  return known.get(website)!;
}

export function CompanyLogo({
  name,
  website,
  size = 'l',
}: {
  name: string;
  website: string | null;
  size?: 'm' | 'l' | 'xl';
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    setSrc(null);
    if (!website) return;
    let cancelled = false;
    lookupLogo(website).then((url) => !cancelled && setSrc(url));
    return () => {
      cancelled = true;
    };
  }, [website]);

  return src ? (
    <Avatar src={src} alt={`${name} logo`} size={size} shape="square" />
  ) : (
    <Avatar name={name} alt={name} size={size} shape="square" colorScheme="gray" />
  );
}
