# 2. Backend framework: Fastify in strict TypeScript

Date: 2026-09-23

## Status

Accepted

## Context

The API relies heavily on validation: role, mode, IDs and notes are all untrusted input.

## Decision

Use Fastify, or a similarly lightweight Node.js framework, with JSON schema validation and typed handlers.

## Consequences

Rejected: Express (weaker built-in validation) and Next.js API routes (tie the domain API to the frontend's deployment). A little more setup, and the team must keep handlers thin.


## In the code

server/app.ts builds the API on Fastify 5 in TypeScript; roles and modes are allow-listed in ShipGateEngine.parseRole and parseMode.
