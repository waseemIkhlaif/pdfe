export const PAGE_STATES = ['populated', 'empty', 'loading', 'error', 'denied'] as const;
export type PageState = (typeof PAGE_STATES)[number];

/**
 * In DEMO mode a page can be shown in any of its five states with `?state=empty|loading|error|denied`: the design review and
 * the checks use it, as the prototype's toolbar does. Outside DEMO the parameter is ignored. (Only DEMO exists, but the guard
 * is the constitution's habit: a demonstration aid never becomes a way to see something else.)
 */
export function pageStateOf(raw: string | string[] | undefined): PageState {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if ((process.env.APP_MODE ?? 'DEMO') !== 'DEMO') return 'populated';
  return (PAGE_STATES as readonly string[]).includes(v ?? '') ? (v as PageState) : 'populated';
}
