# 5. Authorization: the demo role is request input, enforced on the server

Date: 2026-09-23

## Status

Accepted

## Context

The app must work without login, yet an invalid state change must still be refused.

## Decision

The selected role travels with each request, is allow-listed, and is checked on the server for every state-changing action.

## Consequences

Rejected: real OAuth/OIDC (out of scope) and hiding actions in the UI only (bypassable). The actor is a selected role, not a verified person, so the audit evidence is demo evidence.


## In the code

server/engine.ts requireRole() refuses any action by the wrong demo role with 403 ROLE_FORBIDDEN, and appends the refusal to the ledger before throwing.
