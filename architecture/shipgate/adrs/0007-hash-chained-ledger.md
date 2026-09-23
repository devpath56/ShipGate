# 7. Audit model: a hash-chained, append-only ledger kept in the app

Date: 2026-09-23

## Status

Accepted

## Context

Every success and refusal must be evidence, and a plain activity log is not tamper-evident.

## Decision

Each ledger event carries the SHA-256 hash of its predecessor. A transition is not shown as successful unless its append succeeded.

## Consequences

Rejected: a plain log (not tamper-evident) and durable immutable storage (out of scope). Not legally durable across reset or restart; production would need write-once storage and retention.


## In the code

server/ledger.ts hashes each event with its predecessor's hash (SHA-256 over a canonical field list) and verifyChain() recomputes every link.
