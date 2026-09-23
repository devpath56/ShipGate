# 1. Application style: a TypeScript modular monolith

Date: 2026-09-23

## Status

Proposed

## Context

The MVP must keep governance decisions on the server without distributed-system overhead, for eight seeded changes.

## Decision

A React SPA calls one Node.js REST API. Module boundaries separate the state engine, the policy evaluator, the ledger, the seed and the controllers.

## Consequences

Rejected: microservices (too much deployment for eight changes) and a server-rendered full-stack app (risks mixing the UI with ownership of transitions). Scales less independently, and production integrations may later need services extracted.

Source: the decision table in Forge's ShipGate architecture artifact, 2026-09-23.
