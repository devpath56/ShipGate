# 6. Gate policy: a threshold-based severity evaluator

Date: 2026-09-23

## Status

Proposed

## Context

Gates must block on severity consistently across every seeded finding, without policy CRUD.

## Decision

Each policy blocks open findings at or above its threshold. The seeded policy is Secrets must not ship: high and above, owned by Security Owner.

## Consequences

Rejected: a hard-coded CHG-1042 check (unmaintainable) and general policy authoring (out of scope). Limited to the seeded policy taxonomy in the MVP.

Source: the decision table in Forge's ShipGate architecture artifact, 2026-09-23.
