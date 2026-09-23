# 5. Authorization: the demo role is request input, enforced on the server

Date: 2026-09-23

## Status

Proposed

## Context

The app must work without login, yet an invalid state change must still be refused.

## Decision

The selected role travels with each request, is allow-listed, and is checked on the server for every state-changing action.

## Consequences

Rejected: real OAuth/OIDC (out of scope) and hiding actions in the UI only (bypassable). The actor is a selected role, not a verified person, so the audit evidence is demo evidence.

Source: the decision table in Forge's ShipGate architecture artifact, 2026-09-23.
