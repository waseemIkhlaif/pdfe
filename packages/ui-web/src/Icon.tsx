import type { ReactNode } from 'react';

/** The icon set of the approved prototype: 16x16 line icons, drawn with the current text colour. */
const PATHS = {
  pencil: <path d="M3 13l1-4 7-7 3 3-7 7z" />,
  clock: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4v4l3 2" />
    </>
  ),
  'pause-circle': (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M6.5 5.5v5M9.5 5.5v5" />
    </>
  ),
  'search-check': (
    <>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M5.5 7l1.2 1.2L9 5.8M10.5 10.5L14 14" />
    </>
  ),
  'check-circle': (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M5.5 8.2l1.8 1.8 3.2-3.6" />
    </>
  ),
  'x-circle': (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M6 6l4 4M10 6l-4 4" />
    </>
  ),
  undo: <path d="M5 4L2.5 6.5 5 9M3 6.5h6a4 4 0 010 8H6" />,
  'timer-off': (
    <>
      <circle cx="8" cy="9" r="5" />
      <path d="M6 1.5h4M8 6v3M3 3l10 10" />
    </>
  ),
  home: <path d="M2 8l6-5 6 5M4 7v6h8V7" />,
  scan: <path d="M2 5V2h3M11 2h3v3M14 11v3h-3M5 14H2v-3M4 8h8" />,
  send: <path d="M2 8h11M9 4l4 4-4 4" />,
  chart: <path d="M2 13V3M2 13h12M5 10l3-3 2 2 4-5" />,
  user: (
    <>
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M3 14c0-3 2.5-4.5 5-4.5s5 1.5 5 4.5" />
    </>
  ),
  plus: <path d="M8 3v10M3 8h10" />,
  alert: <path d="M8 2l6.5 11.5h-13zM8 6.5v3.5M8 11.8v.4" />,
  info: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7v4M8 4.8v.4" />
    </>
  ),
  lock: (
    <>
      <rect x="3.5" y="7" width="9" height="6.5" rx="1" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
    </>
  ),
  chevron: <path d="M6 3l5 5-5 5" />,
  'chevron-left': <path d="M10 3L5 8l5 5" />,
  copy: (
    <>
      <rect x="5" y="5" width="8" height="8" rx="1" />
      <path d="M3 10V3h7" />
    </>
  ),
  inbox: <path d="M2 9l2-6h8l2 6v4H2zM2 9h4l1 2h2l1-2h4" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

/** Decorative: hidden from assistive technology (the text beside it says what it means). */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={`i${className ? ` ${className}` : ''}`} viewBox="0 0 16 16" aria-hidden="true">
      {PATHS[name] ?? PATHS.info}
    </svg>
  );
}
