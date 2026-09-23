# 4. Client-server sync: synchronous REST with a re-fetch after each action

Date: 2026-09-23

## Status

Accepted

## Context

The requirements prefer synchronous REST, and the pilot is 25 users.

## Decision

Every mutation is a REST command, and the client re-fetches after each one.

## Consequences

Rejected: WebSockets or SSE (unneeded at this scale) and GraphQL (adds schema complexity). No push updates, so concurrent viewers may need to refresh.


## In the code

web/src/api.ts calls /api/v1 with fetch and each page re-fetches after an action; there is no socket or GraphQL layer.
