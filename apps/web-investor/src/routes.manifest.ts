/**
 * Every route of this app, for the checks that crawl it (contracts/ui-shell.md, "Route manifest").
 * `roles`: a demo role that can reach the route (`anonymous` needs no sign-in). `baseline`: the design screen ID
 * for the visual comparison; a route without one is listed by CI. `scripts/ci/check-route-manifests.mjs` fails
 * when a page exists on disk without an entry here, or an entry has no page.
 */
export const routes = [
  { path: '/', roles: ['demo_viewer'], states: ['populated'] },
  { path: '/error', roles: ['demo_viewer'], states: ['error'] },
  { path: '/sign-in', roles: ['anonymous'], states: ['populated'] },
] as const;
