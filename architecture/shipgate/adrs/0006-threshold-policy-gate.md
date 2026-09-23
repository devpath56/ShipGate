# 6. Gate policy: a threshold-based severity evaluator

Date: 2026-09-23

## Status

Accepted

## Context

Gates must block on severity consistently across every seeded finding, without policy CRUD.

## Decision

Each policy blocks open findings at or above its threshold. The seeded policy is Secrets must not ship: high and above, owned by Security Owner.

## Consequences

Rejected: a hard-coded CHG-1042 check (unmaintainable) and general policy authoring (out of scope). Limited to the seeded policy taxonomy in the MVP.


## In the code

server/engine.ts blockingFor() matches open findings to each active policy by category (applies_to) and severity rank; the seeded policy is POL-001 Secrets must not ship.
