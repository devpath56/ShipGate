# 3. State persistence: in memory, seeded on startup

Date: 2026-09-23

## Status

Accepted

## Context

The demo must be repeatable and must not claim production persistence.

## Decision

One backend process holds all state in memory and seeds it deterministically at startup and on reset.

## Consequences

Rejected: PostgreSQL (out of MVP scope) and browser-local state (would break server-side enforcement). State is lost on restart, there is no multi-instance write, and it is not fit for audit retention.


## In the code

server/engine.ts holds changes, findings, policies and the ledger in Maps and an array; reset() rebuilds them from server/seed.ts and sets advisory.
