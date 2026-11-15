# Contract: App shells, simulation banner and route manifests (Phase 2)

Reference designs: `docs/design/packages/phase-02/` (approved 2026-11-15) and the prototype `docs/design/prototype/index.html`. Shared components live in `packages/ui-web` (web) and `packages/ui-native` (mobile). Strings come from `packages/i18n`, generated from the approved copy deck `docs/design/copy-decks/phase-02.md`.

## Shell elements (every app)

| Element | Rule |
|---|---|
| `SimulationBanner` | Rendered by the root layout **outside** all page content; `role="status"`, `data-sim="1"`. Text exactly `SIMULATION — NOT REAL MONEY` (en) or `محاكاة — ليست أموالاً حقيقية` (ar), from key `sim.banner`. No prop can hide it. A lint rule (`no-restricted-imports`) forbids page code from importing the bare layout primitives |
| Badges | Tenant (`Tenant: <name>`), role, `DEMO` environment badge, language |
| Navigation | Web: side navigation from `P.nav`-equivalent config per app, filtered by `/v1/me` permissions. Mobile: bottom tabs Home, Pay, Send, Markets, Profile |
| States | `StateBox` with variants `empty`, `loading` (skeleton, `aria-busy`), `error` (message key, correlation ID with copy button, retry) and `denied`. Every route renders `loading` while fetching and `denied` on 403 |
| Direction | `<html lang dir>` from the locale. Logical CSS only. Amounts and IDs inside `<bdi>`. Western digits by default |
| Error page | `/error` shows `error.global.*` keys plus the correlation ID from the failed request |

## Routes (Phase 2)

| App | Port | Routes |
|---|---|---|
| web-consumer | 3001 | `/sign-in`, `/`, `/settings/language`, `/403`, `/error` |
| web-merchant | 3002 | same five |
| web-business | 3003 | same five |
| web-console | 3004 | same five plus `/admin/users`, `/admin/roles`, `/admin/config`, `/admin/config/[key]` (history, diff, request), `/approvals`, `/approvals/[id]`, `/admin/scenarios`, `/admin/scenarios/runs/[id]`, `/audit`, `/audit/verify`, `/audit/export`, `/elevation` |
| web-investor | 3005 | same five (read-only demo viewer) |
| web-devportal | 3006 | same five |
| mobile | — | tabs Home, Pay, Send, Markets, Profile; `sign-in`, `app-lock`, `settings/language`, `error`, `offline` |

Sign-in: `/sign-in` redirects to the Keycloak hosted page (realm `pdfe-demo`), themed with the tokens and showing the banner through a Keycloak theme. After return, the role picker (demo users) and the second-factor step for privileged roles follow the approved designs.

## Route manifest (consumed by checks)

Each web app exports `src/routes.manifest.ts`:

```ts
export const routes = [
  { path: '/', roles: ['individual'], states: ['populated', 'empty', 'loading', 'error', 'denied'], baseline: 'CON-008' },
  { path: '/settings/language', roles: ['individual'], baseline: 'CON-005' },
  // ...
] as const;
```

- `roles`: a demo role that can reach the route. The crawler signs in as that role, completing the second factor through the fixed synthetic TOTP for privileged roles.
- `baseline`: the screen ID in the Phase 2 manifest, used for the visual comparison. Routes without a design screen omit it, and CI lists them.

A CI step fails if a Next.js route exists on disk but is missing from the manifest (it scans the `app/` directory).

## Mobile

`apps/mobile/maestro/*.yaml` contains one flow per tab and language. Each flow asserts that the banner text is visible, that the layout direction is right-to-left (an `assertVisible` on an element the right-to-left layout positions on the leading edge) and that the accessibility labels are present. The flows run on Android only (spec Q3).
