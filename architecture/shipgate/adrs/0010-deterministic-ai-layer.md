# 10. AI layer: deterministic, grounded in live data, no LLM calls

Date: 2026-09-23

## Status

Accepted

## Context

The demo is recorded and judged on the recording, so an answer must be the same on every take. An
explanation of why a change is blocked must cite the actual finding, policy and ledger, never a
plausible invention. A hosted model adds a key, a network dependency and variance.

## Decision

The AI layer (risk summaries, finding explanations with remediations, the assistant, and policy
suggestions) is generated deterministically from the engine's live state. A suggested policy is
adopted only as a draft, which does not enforce.

## Consequences

Every answer is reproducible and traceable to data. It cannot answer questions outside the
governance vocabulary it was written for; a model-backed version would need the same grounding and
an evaluation before it replaced this one.

## In the code

server/ai.ts: explainFinding, riskSummary, answer, policySuggestion; server/engine.ts
adoptDraftPolicy() sets status draft.
