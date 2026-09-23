# 3. State persistence: in memory, seeded on startup

Date: 2026-09-23

## Status

Proposed

## Context

The demo must be repeatable and must not claim production persistence.

## Decision

One backend process holds all state in memory and seeds it deterministically at startup and on reset.

## Consequences

Rejected: PostgreSQL (out of MVP scope) and browser-local state (would break server-side enforcement). State is lost on restart, there is no multi-instance write, and it is not fit for audit retention.

Source: the decision table in Forge's ShipGate architecture artifact, 2026-09-23.
