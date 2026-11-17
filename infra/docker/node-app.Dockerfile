# syntax=docker/dockerfile:1
# One Dockerfile for every Node app. Build with: --build-arg APP=<package name without @pdfe/> --target <service|web|migrate>
#   service: api, worker, mock-hub (compiled NestJS, `node dist/main.js`)
#   web:     web-* (Next.js standalone output)
#   migrate: platform-core (runs db/migrations once, then exits)
# Images are built with network access; running containers get none (Compose internal network).

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@11.0.9 --activate
WORKDIR /repo

FROM base AS build
ARG APP
# Download dependencies from the lockfile alone first. This layer is reused until the lockfile changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch
COPY . .
RUN pnpm install --offline --frozen-lockfile
RUN pnpm turbo run build --filter=@pdfe/${APP}...

FROM build AS deployed
ARG APP
RUN pnpm --filter @pdfe/${APP} deploy --legacy --prod /out

FROM node:22-slim AS service
ARG APP
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deployed /out/ /app/
USER node
CMD ["node", "dist/main.js"]

FROM node:22-slim AS migrate
ENV NODE_ENV=production
ENV MIGRATIONS_DIR=/app/db/migrations
WORKDIR /app
COPY --from=deployed /out/ /app/
COPY db/migrations /app/db/migrations
USER node
CMD ["node", "dist/migrate/cli.js"]

FROM node:22-slim AS web
ARG APP
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build /repo/apps/${APP}/.next/standalone/ /app/
COPY --from=build /repo/apps/${APP}/.next/static /app/apps/${APP}/.next/static
ENV APP_DIR=apps/${APP}
USER node
CMD ["sh", "-c", "node $APP_DIR/server.js"]
