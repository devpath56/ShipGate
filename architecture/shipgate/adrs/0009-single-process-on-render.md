# 9. Deployment: one long-running process on Render

Date: 2026-09-23

## Status

Accepted

## Context

All governance state lives in one process's memory (decision 3). Two instances would hold two
different ledgers, and a platform that scales to zero would reset the demo between a judge's clicks.
Decision 8's Forge Shipping to ECS pipeline was not built.

## Decision

Deploy as a single Render web service (`render.yaml`): `npm run build` produces the SPA in `dist/`,
and `npm start` runs one Node 22 process that serves both the SPA and `/api/v1`, with
`/api/v1/health` as the health check. Supersedes decision 8.

## Consequences

One URL, no CORS, nothing to coordinate. The free plan may sleep when idle and a restart reseeds the
demo, which Reset demo already does on purpose. It cannot scale out without persistent storage.

## In the code

render.yaml; server/app.ts serves dist/ with @fastify/static and falls back to index.html for
non-API routes.
