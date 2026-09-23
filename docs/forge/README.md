# The Forge trail

How ShipGate went from a prompt to running code through Opsera Forge (SF Enterprise Hackathon 2.0,
2026-09-23). The five artifacts below are exported from the project's Forge journey, unedited
except for the intent summary.

## 1. The journey, stage by stage

| # | Forge stage | What we gave Forge | What Forge produced | Artifact |
|---|---|---|---|---|
| 1 | **Intent** | The legacy pain (CAB by email, findings "informational") and the target app, as a freeform prompt | Intent profile: vision, personas, 8 core features, scope, constraints (94% confidence) | [1-intent.md](1-intent.md) |
| — | *Iteration* | A chat correction: the first draft put the backend and state changes out of scope, which would have made enforcement UI-only | A revised intent with a backend-owned transition engine and 4 personas | same |
| 2 | **PRD-Spec** | Answers to Forge's pre-flight questions: SOC 2 scope; primary outcome = enforcement accuracy; full unauthenticated demo access with an advisory/enforced mode and an explicit state machine; phased rollout | PRD: 12 user stories with acceptance criteria, business rules, KPIs, risks, NFRs | [2-prd-spec.md](2-prd-spec.md) |
| 3 | **Architecture** | Pre-flight: single in-memory process, synchronous REST, in-app ledger only, Forge Shipping | Modular monolith (React + Fastify), 8 ADRs, API contract, security, deployment and component views | [3-architecture.md](3-architecture.md) |
| 4 | **User Stories** | Kept 5 of 6 epics; dropped the validation/performance epic to fit the day | **29 work orders** (WO-001 to WO-029), each with file targets and acceptance criteria | [4-work-orders.md](4-work-orders.md) |
| 5 | **Testing** | Smoke suite only | 29 smoke cases, one per work order | [5-testing.md](5-testing.md) |
| 6 | **Application Context** | Saved the journey; linked `devpath56/ShipGate`; connected the IDE over Forge MCP | Work-order board, repo sync, Connect IDE | — |
| 7 | **Build** | Implemented against the work orders in an IDE connected to Forge's MCP server | This repository | [`server/`](../../server), [`web/`](../../web) |
| 8 | **Track** | Moved the work orders on the Forge board | 27 Completed, 2 In Review (WO-003, WO-014) | Forge board |

## 2. Work order → code

| Work order | Implemented in |
|---|---|
| WO-001 Shared domain contracts | `server/domain.ts` (the web client imports its types from here) |
| WO-002 Deterministic seed data | `server/seed.ts` |
| WO-003 Serialized in-memory store | `server/engine.ts`, **In Review**: state lives in the engine; there is no separate store class or mutation queue |
| WO-004 Hash-chained ledger | `server/ledger.ts` (SHA-256 chain + head anchor) |
| WO-005 Allow-list request validators | `server/engine.ts` (role, mode, note), `server/app.ts` (IDs, JSON body) |
| WO-006 Threshold gate verdicts | `server/engine.ts` `blockingFor`, `gatesFor` |
| WO-007 Versioned Fastify routes | `server/app.ts` (`/api/v1`, error envelope) |
| WO-008 Advisory / enforced modes | `server/engine.ts` `setMode`, `server/app.ts` `/mode` |
| WO-009 Change read APIs | `server/app.ts` `GET /changes`, `GET /changes/:id` |
| WO-010 Reset seeded demo state | `server/engine.ts` `reset`, `POST /reset` |
| WO-011 Backend state transitions | `server/engine.ts` `submit`, `approve`, `ship`, `resolveFinding` |
| WO-012 Policies + reset APIs | `server/app.ts` |
| WO-013 Transition command APIs | `server/app.ts` |
| WO-014 Typed API client | `web/src/api.ts`, **In Review**: method names and one route path differ from the acceptance criteria |
| WO-015 Route shell | `web/src/App.tsx` |
| WO-016 Demo role switcher | `web/src/App.tsx` |
| WO-017 Mode toggle | `web/src/App.tsx` |
| WO-018 Severity badges | `web/src/ui.tsx` |
| WO-019 Active policy list | `web/src/pages/Policies.tsx` |
| WO-020 Legacy approval mock | `web/src/pages/Legacy.tsx` |
| WO-021 Demo safety labels | `web/src/App.tsx`, `web/src/ui.tsx` |
| WO-022 Grouped gate dashboard | `web/src/pages/Dashboard.tsx` |
| WO-023 Change evidence panels | `web/src/pages/ChangeDetail.tsx` |
| WO-024 Reset from header | `web/src/App.tsx` |
| WO-025 Responsive navigation | `web/src/App.tsx`, `web/src/styles.css` |
| WO-026 Ledger hash timeline | `web/src/pages/ChangeDetail.tsx`, `web/src/pages/Ledger.tsx` |
| WO-027 Developer submit action | `web/src/pages/ChangeDetail.tsx` |
| WO-028 Resolve finding with note | `web/src/pages/ChangeDetail.tsx` |
| WO-029 Approve / ship actions | `web/src/pages/ChangeDetail.tsx` |
| *Beyond the work orders* | `server/ai.ts`: risk summary, finding explanations, governance assistant, policy suggestion (added from a PM follow-up; Forge's artifacts had no AI layer) |

## 3. What differs from the Forge plan, and why

| Planned in Forge | Built | Why |
|---|---|---|
| Monorepo: `packages/shared`, `apps/api`, `apps/web` | Single package: `server/`, `web/` | Fewer moving parts for a one-day build; module boundaries kept |
| Playwright e2e and per-component tests | 24 engine and HTTP API tests; an adversarial audit | Time; the tests cover the demo's falsifier (nothing flagged ships in enforced mode) |
| Forge Shipping to AWS ECS (ADR-0008) | One Node process on Render (ADR-0009) | Shipping isn't enabled on the free hackathon workspace; the Opsera team confirmed Render |
