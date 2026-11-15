# Local setup runbook

PDFE is a simulation-only platform. Everything here runs on your own machine with synthetic data. Nothing connects to a real bank, payment network, blockchain or identity service.

## Prerequisites

| Tool                    | Version                                | Notes                                                                                           |
| ----------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Git                     | any recent                             |                                                                                                 |
| Node.js                 | 22 LTS or newer                        | The workstation uses 25.x; CI uses 22.                                                          |
| pnpm                    | **11.0.9**                             | `corepack enable && corepack prepare pnpm@11.0.9 --activate`. Always name the version, see below. |
| Docker                  | Docker Desktop 28 or newer, or Docker Engine on Linux | Windows 11: Docker Desktop with the WSL2 backend. Give it about 8 GB of memory. |
| Android emulator (mobile only) | API 34                          | Android Studio. The Maestro CLI is also needed for mobile checks.                              |

Why name the pnpm version: `corepack prepare pnpm@latest` can fetch a newer major than the one the lockfile was written with. CI pins the same version.

## First run

```bash
git clone <repository> pdfe && cd pdfe
pnpm bootstrap     # checks tools, installs, writes .env (once), builds shared packages and images
pnpm dev:all       # starts everything in containers, waits until healthy, runs the smoke test
```

`pnpm bootstrap` is safe to run again. It never overwrites an existing `.env`. Delete `.env` to get new random development secrets.

When `dev:all` finishes, these addresses work:

| Address                          | What                          |
| -------------------------------- | ----------------------------- |
| http://localhost:3001            | Consumer web app              |
| http://localhost:3002            | Merchant web app              |
| http://localhost:3003            | Business web app              |
| http://localhost:3004            | Console (operations, compliance, finance, admin) |
| http://localhost:3005            | Investor web app              |
| http://localhost:3006            | Developer portal              |
| http://localhost:4000/v1/health  | API health, reports `mode: DEMO` |

Every page shows the banner **SIMULATION — NOT REAL MONEY / محاكاة — ليست أموالاً حقيقية**.

## The two run modes

| Mode             | Command        | What runs where                                                                  | What it proves                                                                  |
| ---------------- | -------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Acceptance       | `pnpm dev:all` | Everything in containers                                                         | The whole stack works from a clean clone. Used by the CI `fresh-clone` job.     |
| Fast development | `pnpm dev`     | Postgres and Redis in containers (published on 127.0.0.1 only), apps on the host | Quick edits with watch mode. Only the in-code network guard applies in this mode (it is added with the safety boundary), not the container network rules. |

## Everyday commands

| Command                                                       | Does                                                  |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| `pnpm test`                                                   | Script tests, unit tests, integration tests, and end-to-end tests if the stack is running |
| `pnpm test:unit` / `pnpm test:int`                            | One layer. Integration tests start their own Postgres and Redis containers.   |
| `pnpm lint` / `pnpm typecheck` / `pnpm format:check`          | Static checks. `pnpm format` fixes formatting.        |
| `pnpm build`                                                  | Build every package and app                           |
| `pnpm down`                                                   | Stop the stack, keep the data                         |
| `pnpm reset`                                                  | Stop the stack and delete its volumes                 |

## Safety boundary

The platform cannot reach anything real. Three layers enforce this:

1. **Start-up checks.** The api refuses to start (exit code 1, message starting `system.start_refused`) if `APP_MODE` is not `DEMO`, if `INTERNAL_HOSTS` differs from the fixed list, or if `ADAPTERS_CONFIG` names any adapter that is not its own mock (`mock:bank`, `mock:psp`, and so on), an unknown kind, or leaves a kind out. Live adapter classes exist but are never registered and fail before doing anything.
2. **In-code egress guard.** The api, worker and mock-hub refuse any connection to a host outside the internal list, before any name lookup.
3. **Container network.** In `pnpm dev:all` every service sits on an internal Compose network with no route to the internet. Only the gateway container is also on the outside network, and it publishes the apps on `127.0.0.1` only.

Check layer 3 any time the stack is running:

```bash
pnpm egress:probe     # tries to reach the internet from inside api, worker and mock-hub; every probe must be blocked
```

It writes `egress-report.txt` (not committed) and exits non-zero if anything got through.

`pnpm dev` (fast mode) has only layers 1 and 2, because the apps run on your machine. Use `pnpm dev:all` when you need to prove the boundary.

## Troubleshooting

- **A script fails with `\r: command not found` or a checksum mismatch.** Git converted line endings to CRLF. `.gitattributes` forces LF for scripts, SQL, Dockerfiles and checksum lists. Re-clone, or run `git add --renormalize .`.
- **`dev:all` times out waiting for a service.** Check Docker has enough memory, then read the logs: `docker compose --env-file .env -f infra/docker-compose.yml logs <service>`.
- **A port is already in use.** Stop whatever uses 3001–3006, 4000, 5432 or 6379, or run `pnpm down` for a stale stack.
- **`ERR_PNPM_IGNORED_BUILDS` during install.** A new dependency has an install script. Decide whether it is needed, then list it in `pnpm-workspace.yaml` under `allowBuilds` with a reason.
- **Docker build fails with `unknown file mode`.** A `node_modules` folder is being sent as build context. `.dockerignore` must contain `**/node_modules`.
- **`pnpm install --frozen-lockfile` fails in Docker.** The lockfile changed while an image was building. Run the command again.

## Where things are

See `specs/001-platform-foundation/plan.md` for the structure, and `specs/001-platform-foundation/quickstart.md` for the checks that prove each success criterion.
