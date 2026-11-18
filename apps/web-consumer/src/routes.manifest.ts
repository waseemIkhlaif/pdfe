/**
 * Every route of this app, for the checks that crawl it (contracts/ui-shell.md, "Route manifest").
 * `roles`: a demo role that can reach the route (`anonymous` needs no sign-in). `states`: the page states it can show
 * (`?state=` in DEMO). `baseline`: the design screen ID for the visual comparison; a route without one is listed by CI.
 * `roleBaselines`: more baselines for the same route, one per role (`role:SCREEN`). `example`: a concrete path to visit when
 * the route has a parameter. `scripts/ci/check-route-manifests.mjs` fails when a page exists on disk without an entry
 * here, or an entry has no page.
 */
export const routes = [
  {
    path: '/',
    roles: ['individual'],
    states: ['populated', 'empty', 'loading', 'error', 'denied'],
    baseline: 'CON-008',
  },
  {
    path: '/settings/language',
    roles: ['individual'],
    states: ['populated', 'empty', 'loading', 'error', 'denied'],
    baseline: 'CON-005',
  },
  { path: '/sign-in', roles: ['anonymous'], states: ['populated'], baseline: 'CON-004' },
  { path: '/403', roles: ['anonymous'], states: ['denied'] },
  { path: '/error', roles: ['anonymous'], states: ['error'] },
] as const;
