'use client';

import { useEffect, useState } from 'react';

/**
 * The time left of an elevation, counting down each second as `mm:ss` (left to right, Western digits). The server renders
 * the expiry time itself and tells this component what time it is there (`serverNow`); the component only counts the
 * seconds that pass on the page (`performance.now`), so it never reads the clock of the browser, and a page that never runs
 * scripts still tells the truth.
 */
export function Countdown({
  expiresAt,
  serverNow,
  endedLabel,
}: {
  expiresAt: string;
  serverNow: string;
  endedLabel: string;
}) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const total = Math.floor(
      (new Date(expiresAt).getTime() - new Date(serverNow).getTime()) / 1000,
    );
    const tick = () => setLeft(Math.max(0, total - Math.floor((performance.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, serverNow]);
  if (left === null) return null;
  if (left === 0) return <span role="status">{endedLabel}</span>;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return (
    <bdi className="ltr" dir="ltr" data-testid="elevation-countdown" aria-live="off">
      {`${mm}:${ss}`}
    </bdi>
  );
}
