# Contract: `packages/design-tokens`

The design-token package is the single source of design values (research R-2). Its consumers are web apps (feature 009 onward, CSS custom properties), the mobile app (feature 009 onward, TS theme) and Figma (imported through Tokens Studio).

## Layout

```text
packages/design-tokens/
├── package.json            # name "@pdfe/design-tokens", private, engines.node ">=22", exact-pinned style-dictionary
├── pnpm-lock.yaml
├── sd.config.mjs           # Style Dictionary v4 config, DTCG mode
├── tokens/
│   ├── color.json          # brand (replaceable, D-04), neutral 0–950, semantic, simulation (reserved), dataviz
│   ├── typography.json     # families, scale 12…36, weights, tabular-nums flag
│   ├── spacing.json        # 0,4,8,12,16,24,32,48,64
│   ├── radius.json         # 4,8,12,full
│   ├── elevation.json      # 1–3
│   ├── motion.json         # 150, 250 + reduced-motion twins
│   ├── breakpoint.json     # 360,768,1024,1280,1536
│   └── pairs.json          # declared contrast pairs (research R-4)
├── scripts/
│   └── check-contrast.mjs  # dependency-free
└── dist/                   # build output, git-ignored
    ├── web/tokens.css      # :root { --pdfe-… } + [dir] safe, logical names only
    ├── native/theme.ts     # export const theme = {...} as const
    └── tokens.resolved.json  # flat resolved values (consumed by Figma import + checks)
```

## Commands

| Command | Result | Exit |
|---|---|---|
| `pnpm --dir packages/design-tokens install --frozen-lockfile` | Installs the pinned dependencies | 0 |
| `pnpm --dir packages/design-tokens build` | Writes all three `dist/` outputs | 0 on success; non-zero on invalid DTCG or an unresolved reference |
| `pnpm --dir packages/design-tokens check` | Runs `check-contrast.mjs` | 0 if all pairs pass; 1 if any fails, printing `FAIL <pair-id> <ratio> < <required>` |

## Rules

1. **Format**: W3C DTCG (`$value`, `$type`, `$description`). References use `{group.token}` aliases.
2. **Names**:
   - CSS variables are `--pdfe-<path-kebab>`, for example `--pdfe-color-semantic-danger-fg`.
   - TS keys use the camelCase path, for example `theme.color.semantic.dangerFg`.
   - Outputs never use physical names such as `left` or `right`. Spacing tokens are direction-free, and the components apply them with logical properties.
3. **Reserved accent**: tokens under `color.simulation.*` carry `$extensions.pdfe.reserved = "simulation-only"`. The contrast checker fails if any pair with `group != "simulation"` references one of them.
4. **Brand token**: `color.brand.primary` is the only token that D-04 changes. Every other brand-tinted token aliases it.
5. **Motion**: every `motion.duration.*` token has a `motion.reduced.*` twin, which is `0ms` or a fade-only duration.
6. **Determinism**: the same input always gives byte-identical output, with no timestamps in the generated files (Article X). CI builds twice and compares the two outputs.
7. **Pairs file** (`pairs.json`): an array of `{ "id", "fg", "bg", "usage": "text"|"large-text"|"ui", "group": "general"|"simulation" }`. The required ratio is derived from `usage`: `text` needs 4.5, while `large-text` and `ui` need 3.0.
8. **Stability**: once feature 009 consumes this package, output paths and the naming scheme are a compatibility contract. Renaming a token needs an alias that is kept for one phase, plus an entry in `docs/design/system/CHANGELOG.md`.

## Feature 001 integration

Feature 001 adds `packages/design-tokens` to the pnpm workspace and Turborepo pipeline and drops the package-local lockfile in favor of the workspace lockfile. The commands and output paths above do not change.
