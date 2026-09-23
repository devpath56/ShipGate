## Domain model, deterministic seed data, and in-memory evidence foundation

### [P0] Define shared ShipGate domain contracts

Create the shared TypeScript domain contracts so backend services and frontend views use one authoritative model for release-governance evidence and cannot drift on severity, status, role, mode, verdict, or state values. This work belongs in the DomainTypes module at packages/shared/src/domainTypes.ts. The current greenfield foundation has no indexed shared model file, so downstream seed loading, in-memory storage, request validation, policy evaluation, and ledger services would otherwise duplicate entity shapes and enum strings. Stakeholders need these contracts because ShipGate’s central promise depends on deterministic, explainable decisions for changes, findings, policies, gates, and ledger events. When complete, developers can import typed changes, findings, policies, gates, ledger events, roles, modes, severities, categories, statuses, verdicts, and states from a single shared file. The exported values must constrain finding severities to info, low, medium, high, and critical, and categories to prompt injection, tool exfiltration, scope creep, secret handling, dependency risk, and compliance gaps. The contract should include the exact required entity fields while still allowing implementation-specific identifiers and timestamps to be represented consistently. This story does not implement seed records, a runtime store, hashing, validators, REST endpoints, UI screens, or state transition rules. It depends only on the TypeScript project structure being available and is the capability that later data, store, ledger, and validator components consume.

| Field | Value |
|---|---|
| Story Points | 2 |
| Hours | 20h |
| Priority | P0 |
| Labels | epic:domain-foundation, type:shared-contracts, complexity:low |

**Acceptance Criteria**
- File inspection of packages/shared/src/domainTypes.ts shows exported TypeScript types or readonly value unions for Change, Finding, Policy, Gate, LedgerEvent, ShipGateRole, ShipGateMode, FindingSeverity, FindingCategory, FindingStatus, GateVerdict, and ChangeState.
- File inspection of packages/shared/src/domainTypes.ts shows Change has id, title, source, summary, and state fields; Finding has id, change, category, severity, status, and detail fields; Policy has id, name, description, block_severity_threshold, and owner_role fields; Gate has change, policy, verdict, reason, decided_by, and timestamp fields; LedgerEvent has change, from_state, to_state, actor, timestamp, note, and prev_hash fields.
- A TypeScript compile command such as npm run typecheck exits with code 0 and rejects an invalid FindingSeverity assignment outside packages/shared/src/domainTypes.ts, for example a value other than info, low, medium, high, or critical in a type-level fixture.
- Unit tests written and passing: running npm test -- domainTypes exits with code 0 and includes assertions that FindingCategory contains exactly prompt injection, tool exfiltration, scope creep, secret handling, dependency risk, and compliance gaps.
- System integration tests: N/A — packages/shared/src/domainTypes.ts exports compile-time contracts only and has no API boundary or service interaction to exercise.
- Mock data or fixtures generated and committed: a test fixture or type-level sample under the existing test structure imports packages/shared/src/domainTypes.ts and instantiates at least one Change, Finding, Policy, Gate, and LedgerEvent without external dependencies.

### [P0] Seed deterministic ShipGate demo data

Implement deterministic seed loading so every startup and reset can restore the same eight ShipGate changes and the active blocking policy that proves critical findings cannot be rubber-stamped. This work belongs in the SeedDataLoader module at apps/api/src/domain/SeedDataLoader.ts. The current foundation has no accessible seed loader, so the demo cannot reliably show CHG-1042 as the canonical blocked change or restore a known state for repeated evaluator walkthroughs. Stakeholders need this because reset reliability and decision explainability depend on stable IDs, stable finding distribution, and a known policy named Secrets must not ship. When complete, the loader returns typed changes, findings, policies, gates, ledger events, and default mode data built from shared domain contracts. The seeded dataset must include CHG-1041 through CHG-1048, with CHG-1042 in IN_REVIEW, titled Add vendor export API, containing one open critical secret-handling finding with detail live credential detected in generated specification, plus two open medium findings. The remaining changes should intentionally cover clean, low, medium, resolved, approved, shipped, draft, and review scenarios so dashboards and detail screens have useful evidence variety. The policy must be active in the data model, owned by Security Owner, named Secrets must not ship, and use a high-and-above threshold. This story does not implement the in-memory store, reset endpoint, state transition engine, policy evaluator, REST controllers, or ledger hashing service. It depends on the shared contract capability that defines canonical entity shapes and allowed values.

| Field | Value |
|---|---|
| Story Points | 3 |
| Hours | 30h |
| Priority | P0 |
| Labels | epic:domain-foundation, type:seed-data, complexity:medium |

**Acceptance Criteria**
- File inspection of apps/api/src/domain/SeedDataLoader.ts shows an exported SeedDataLoader class or createSeedData function that imports entity types and allow-list values from packages/shared/src/domainTypes.ts.
- Running npm test -- SeedDataLoader exits with code 0 and includes an assertion that the returned changes contain exactly the IDs CHG-1041, CHG-1042, CHG-1043, CHG-1044, CHG-1045, CHG-1046, CHG-1047, and CHG-1048.
- Running npm test -- SeedDataLoader exits with code 0 and includes assertions that CHG-1042 has title Add vendor export API, state IN_REVIEW, one open critical finding in category secret handling with detail live credential detected in generated specification, and exactly two medium-severity findings.
- Running npm test -- SeedDataLoader exits with code 0 and includes assertions that policies include one active policy named Secrets must not ship with block_severity_threshold high, owner_role Security Owner, and no additional active blocking policy.
- Unit tests written and passing: apps/api/src/domain/SeedDataLoader.ts has tests that verify deterministic deep equality across two consecutive seed loads and verify ledger_events are returned as an initialized array.
- System integration tests: N/A — apps/api/src/domain/SeedDataLoader.ts is a domain data factory and is not exposed through a REST endpoint until store and reset API components are implemented.
- Mock data or fixtures generated and committed: the deterministic seed dataset is committed in apps/api/src/domain/SeedDataLoader.ts or an adjacent imported seed fixture, with no external files, network calls, random IDs, or current-time generation required to build CHG-1041 through CHG-1048.

**Depends on:** WO-001

### [P0] Build serialized in-memory ShipGate store

Implement the backend in-memory store so ShipGate has one authoritative runtime state container with serialized mutations for changes, findings, policies, gates, ledger events, and operating mode. This work belongs in the InMemoryShipGateStore module at apps/api/src/store/InMemoryShipGateStore.ts. The current foundation has no accessible runtime store, so later controllers and domain services would have no safe place to read current data, apply reset snapshots, append ledger events, or coordinate concurrent demo actions. Stakeholders need this because the demo must remain repeatable under pilot usage and must not expose partially applied transitions when multiple users interact at the same time. When complete, consumers can initialize the store from deterministic seed data, read immutable or defensive-copy snapshots, perform mutation callbacks one at a time, append ledger events only through explicit store methods, and reset all runtime state back to a fresh seed snapshot. The store should include mode state because reset must restore advisory mode alongside entity collections. Serialized mutation access can be implemented with a lightweight promise queue or equivalent process-local critical section appropriate for a single Node.js process. This story does not implement HTTP endpoints, policy evaluation, state transition rules, hashing, role authorization, or request validators. It depends on the shared contract capability and is expected to consume deterministic seed snapshots when available, but it must keep store responsibilities separate from seed construction.

| Field | Value |
|---|---|
| Story Points | 5 |
| Hours | 50h |
| Priority | P0 |
| Labels | epic:domain-foundation, type:in-memory-store, complexity:medium |

**Acceptance Criteria**
- File inspection of apps/api/src/store/InMemoryShipGateStore.ts shows an exported InMemoryShipGateStore class with methods or equivalent API for reading changes, findings, policies, gates, ledger_events, and mode from typed in-memory state.
- File inspection of apps/api/src/store/InMemoryShipGateStore.ts shows a serialized mutation method such as withMutation, transaction, or mutate that queues concurrent callbacks and executes them in request order before returning updated state.
- Running npm test -- InMemoryShipGateStore exits with code 0 and includes an assertion that mutating a snapshot returned from a read method does not alter the internal stored Change or Finding object.
- Running npm test -- InMemoryShipGateStore exits with code 0 and includes an assertion that reset reloads changes, findings, policies, gates, ledger_events, and mode from the seed provider, including advisory mode.
- Running npm test -- InMemoryShipGateStore exits with code 0 and includes an assertion that appendLedgerEvent adds to ledger_events but no public method replaces the entire ledger_events collection except reset.
- Unit tests written and passing: apps/api/src/store/InMemoryShipGateStore.ts has tests covering reads, reset, defensive snapshots, mode set or get behavior, ledger append behavior, and serialized mutation ordering.
- System integration tests: a store-level integration test constructs InMemoryShipGateStore with SeedDataLoader from apps/api/src/domain/SeedDataLoader.ts and verifies CHG-1042 and the Secrets must not ship policy are readable through store methods.
- Mock data or fixtures generated and committed: tests for apps/api/src/store/InMemoryShipGateStore.ts use committed SeedDataLoader data or a small typed fixture and do not depend on network services, databases, or wall-clock timing.

**Depends on:** WO-001

### [P0] Implement hash-chained ledger service

Implement the ledger hashing service so every successful and refused ShipGate transition can be linked to prior evidence through a deterministic prev_hash chain. This work belongs in the HashLedgerService module at apps/api/src/domain/HashLedgerService.ts. The current foundation has no accessible ledger hashing component, so later transition logic cannot prove append-only ordering or provide tamper-evident evidence for approval, refusal, resolution, shipment, or reset-related decisions. Stakeholders need this because SOC 2-oriented audit narratives and evaluator trust depend on visible evidence that critical security findings were not silently overridden. When complete, the service can take a transition event payload, read the previous ledger event hash or genesis value, canonicalize the event fields, compute a SHA-256 hash, and return an event ready to append with prev_hash populated. The service must support both successful transitions and refused attempts, including attempted action, actor, reason, timestamp, optional note, and previous hash evidence where the shared ledger event shape allows or extends these values. It should be deterministic for identical input and avoid hashing unstable object key order. This story does not implement state transition decisions, policy blocking, HTTP endpoints, UI ledger timelines, persistent storage, or operational log retention. It depends on the shared domain contract capability and will later be used by store-backed transition services that append returned ledger events atomically.

| Field | Value |
|---|---|
| Story Points | 5 |
| Hours | 50h |
| Priority | P0 |
| Labels | epic:domain-foundation, type:audit-ledger, complexity:medium |

**Acceptance Criteria**
- File inspection of apps/api/src/domain/HashLedgerService.ts shows an exported HashLedgerService class or createLedgerEvent function that imports LedgerEvent or related ledger types from packages/shared/src/domainTypes.ts.
- Running npm test -- HashLedgerService exits with code 0 and includes an assertion that the first generated ledger event has prev_hash set to a documented genesis value such as GENESIS or an empty string handled consistently by apps/api/src/domain/HashLedgerService.ts.
- Running npm test -- HashLedgerService exits with code 0 and includes an assertion that a second generated ledger event uses the first event hash as prev_hash and that changing the first event note or timestamp changes the second event chain input expectation.
- Running npm test -- HashLedgerService exits with code 0 and includes assertions for both a successful transition event and a refused transition event containing attempted action, actor, reason, timestamp, optional note, and prev_hash evidence in the returned ledger payload or metadata.
- Unit tests written and passing: apps/api/src/domain/HashLedgerService.ts has tests for canonical serialization, deterministic SHA-256 hash output, genesis prev_hash behavior, chained prev_hash behavior, and refused transition evidence fields.
- System integration tests: a domain integration test uses apps/api/src/domain/HashLedgerService.ts with apps/api/src/store/InMemoryShipGateStore.ts appendLedgerEvent or an equivalent store append method to verify two appended ledger_events preserve prev_hash order.
- Mock data or fixtures generated and committed: tests include committed ledger event fixtures for one success and one refusal scenario using demo actor roles and no real secrets.

**Depends on:** WO-001

### [P0] Add allow-list API request validators

Add allow-list request validators so API controllers can reject untrusted role, mode, change ID, finding ID, and resolution note inputs before domain services mutate ShipGate state. This work belongs in the SchemaValidators module at apps/api/src/controllers/schemaValidators.ts. The current foundation has no accessible controller validation module, so future REST endpoints would risk accepting unsupported roles, invalid modes, malformed identifiers, or blank resolution notes that undermine backend-owned enforcement. Stakeholders need this because ShipGate’s demo is unauthenticated by design, which makes every incoming role, mode, identifier, and note value untrusted even when the UI hides invalid actions. When complete, controller code can call exported validator functions and receive typed, trimmed, allow-listed values or a structured validation failure that maps cleanly to HTTP 400. The validators must use shared domain allow-lists so they cannot drift from the values used by seed data, store records, and later transition logic. Change IDs should be constrained to the deterministic format and seeded range expected for the MVP, while finding IDs should follow the committed seed-data identifier convention rather than accepting arbitrary strings. Resolution notes must reject empty or whitespace-only values and enforce a bounded maximum length suitable for safe demo evidence. This story does not implement REST routes, authorization checks, transition decisions, UI form behavior, or persistent audit logging. It depends on the shared contract capability and supports later controllers that enforce roles and modes server-side.

| Field | Value |
|---|---|
| Story Points | 3 |
| Hours | 30h |
| Priority | P0 |
| Labels | epic:domain-foundation, type:input-validation, security:allow-list, complexity:medium |

**Acceptance Criteria**
- File inspection of apps/api/src/controllers/schemaValidators.ts shows exported functions for validating role, mode, change ID, finding ID, and resolution note inputs using allow-lists imported from packages/shared/src/domainTypes.ts.
- Running npm test -- schemaValidators exits with code 0 and includes assertions that validateRole accepts only Developer, Approver, Security Owner, and Judge / Guest or the exact shared role values exported by packages/shared/src/domainTypes.ts.
- Running npm test -- schemaValidators exits with code 0 and includes assertions that validateMode accepts only advisory and enforced from packages/shared/src/domainTypes.ts and rejects values such as production, bypass, null, and an empty string.
- Running npm test -- schemaValidators exits with code 0 and includes assertions that validateChangeId accepts CHG-1041 through CHG-1048 and rejects CHG-1040, CHG-1049, lowercase IDs, path traversal strings, and strings containing whitespace.
- Running npm test -- schemaValidators exits with code 0 and includes assertions that validateResolutionNote trims leading and trailing whitespace, rejects empty or whitespace-only input, and rejects input longer than the configured maximum length in apps/api/src/controllers/schemaValidators.ts.
- Unit tests written and passing: apps/api/src/controllers/schemaValidators.ts has tests for valid and invalid role, mode, change ID, finding ID, and resolution note cases, including unknown values and non-string inputs.
- System integration tests: N/A — apps/api/src/controllers/schemaValidators.ts provides controller-boundary validation helpers, and endpoint integration tests will be added when REST routes exist.
- Mock data or fixtures generated and committed: validator tests include committed valid and invalid input tables for roles, modes, change IDs, finding IDs, and notes with no external dependencies.

**Depends on:** WO-001

---

## Backend-owned policy evaluation, state transitions, mode control, reset, and REST API

### [P0] Evaluate threshold-based gate verdicts

Implement a policy evaluation engine that calculates allow or block gate verdicts so stakeholders can see exactly why each change is eligible or blocked under the active high-and-above severity policy. The domain implementation belongs in the PolicyEvaluationEngine module at apps/api/src/domain/PolicyEvaluationEngine.ts, where the evaluator should compare open findings against active policy thresholds without depending on Fastify or HTTP objects. This is core to the ShipGate promise because critical and high findings must no longer be treated as informational or approved through ambiguous meeting notes. When complete, CHG-1042-style data with an open critical secret-handling finding evaluates to block, while changes with only resolved or below-threshold findings evaluate to allow. The engine should return structured reasons that controllers can later expose in gate verdict panels and dashboard grouping. This story does not mutate change state, write ledger events, implement REST controllers, or decide advisory versus enforced transition behavior. It depends on seeded domain entities and shared enumerations for severity, finding status, policy threshold, policy activity, and gate verdicts. The implementation must be deterministic, side-effect free, and easy to unit test because transition enforcement depends on it for every approval and shipment decision. The observable result is a reusable class or function that returns a verdict, policy references, blocking finding IDs, and human-readable reason text from in-memory domain data.

| Field | Value |
|---|---|
| Story Points | 3 |
| Hours | 30h |
| Priority | P0 |
| Labels | epic:backend-governance, component:domain, complexity:medium, priority:P0 |

**Acceptance Criteria**
- File inspection of apps/api/src/domain/PolicyEvaluationEngine.ts shows a PolicyEvaluationEngine export with an evaluateChange or equivalent method that accepts a change, findings, and policies without importing Fastify.
- A unit test for apps/api/src/domain/PolicyEvaluationEngine.ts asserts that an open critical finding under a high-and-above policy returns verdict equal to block and includes the blocking finding id in the evaluation result.
- A unit test for apps/api/src/domain/PolicyEvaluationEngine.ts asserts that resolved high or critical findings are ignored and a change with only resolved blocking findings returns verdict equal to allow.
- A unit test for apps/api/src/domain/PolicyEvaluationEngine.ts asserts that open info, low, and medium findings do not block when block_severity_threshold is high-and-above.
- System integration tests: N/A — this story implements a pure domain engine with no HTTP boundary; integration coverage is added when read and command controllers expose gate verdicts.
- Mock data / fixtures: committed test fixtures or factory data include at least one open critical finding, one resolved critical finding, and one medium finding for apps/api/src/domain/PolicyEvaluationEngine.ts tests.

**Depends on:** WO-001, WO-002

### [P0] Register versioned Fastify API routes

Configure a versioned Fastify route registry and structured JSON response envelope so ShipGate clients receive deterministic REST responses for every governance read and command under the API namespace. The change belongs in the Server module at apps/api/src/server.ts, which should become the backend entry point that wires controllers, health behavior, centralized error mapping, and route registration for /api/v1 endpoints. This matters because the frontend must never mutate release-governance state directly and needs a reliable API boundary for policy evaluation, transitions, mode control, reset, and ledger evidence. When complete, API responses expose a consistent success envelope with data and metadata, and failures expose a structured error object with actionable messages and proper HTTP status codes. The route registry should make it clear which controller owns changes, transitions, demo policy/reset behavior, and mode behavior without embedding business rules in the server bootstrap. This story does not implement policy evaluation logic, state transition rules, reset semantics, seed data, or UI integration. It depends on the availability of domain types, in-memory state primitives, and controller registration functions that can be mounted by Fastify. The implementation should preserve operational debuggability by logging request failures with route, method, operation, and sanitized resource context while avoiding stack traces or secrets in JSON responses. The result should be inspectable by a developer running the API locally and issuing requests to /api/v1 routes that return predictable envelopes instead of ad hoc JSON.

| Field | Value |
|---|---|
| Story Points | 3 |
| Hours | 30h |
| Priority | P0 |
| Labels | epic:backend-governance, component:api, complexity:medium, priority:P0 |

**Acceptance Criteria**
- File inspection of apps/api/src/server.ts shows Fastify is initialized once and all ShipGate API routes are registered under the /api/v1 prefix rather than unversioned endpoint paths.
- A request to GET /api/v1/health returns status code 200 with a JSON body containing data.status equal to ok and an envelope field such as meta.requestId or meta.timestamp.
- A request to an unknown /api/v1/not-a-route path returns status code 404 with error.code equal to NOT_FOUND and does not include stack or raw exception fields in the response body.
- Unit tests: running the repository test command with a server route registry filter validates the response-envelope helper or server build function in apps/api/src/server.ts for both success and error payloads.
- System integration tests: running the repository API integration test command exercises GET /api/v1/health and an unknown /api/v1 route and asserts status codes 200 and 404 respectively.
- Mock data / fixtures: N/A — this story only creates server wiring and response-envelope behavior, and no domain seed data is required to verify apps/api/src/server.ts.

**Depends on:** WO-001, WO-005

### [P0] Manage advisory and enforced modes

Implement backend-owned demo mode management and /api/v1/mode handlers so evaluators can switch between advisory baseline behavior and enforced governance behavior without relying on frontend-only state. The service implementation belongs in the DemoModeService module at apps/api/src/application/DemoModeService.ts, with HTTP handlers registered for GET /api/v1/mode and POST /api/v1/mode through the versioned API route system. This matters because ShipGate must demonstrate the contrast between legacy-style advisory approvals and deterministic enforced blocking while keeping the selected mode authoritative on the backend. When complete, GET /api/v1/mode returns the current mode, POST /api/v1/mode accepts only advisory or enforced, and invalid values are rejected with a structured 400 response. Advisory mode will later allow approval and shipment with explicit exception evidence, while enforced mode will later refuse blocked approval and shipment attempts. This story does not implement the state transition engine, dashboard UI toggle, reset behavior, or ledger semantics for approvals and shipments. It depends on the route registry, shared mode enumeration, in-memory store capability, and response-envelope conventions. The service should be small and injectable so reset and transition logic can read or set mode without importing HTTP modules. The observable behavior is a stable backend mode value that survives normal API calls during the process lifetime and can be reset by later reset behavior.

| Field | Value |
|---|---|
| Story Points | 3 |
| Hours | 30h |
| Priority | P0 |
| Labels | epic:backend-governance, component:application-service, component:api, complexity:medium, priority:P0 |

**Acceptance Criteria**
- File inspection of apps/api/src/application/DemoModeService.ts shows a DemoModeService export with getMode and setMode methods that allow only advisory and enforced values.
- GET /api/v1/mode returns status code 200 with data.mode equal to advisory or enforced in the standard JSON envelope.
- POST /api/v1/mode with body {"mode":"enforced"} returns status code 200 and a subsequent GET /api/v1/mode returns data.mode equal to enforced.
- POST /api/v1/mode with body {"mode":"invalid"} returns status code 400 with error.code equal to VALIDATION_ERROR or equivalent structured validation code.
- Unit tests: running the repository test command with a DemoModeService filter validates default advisory mode, setMode to enforced, setMode back to advisory, and invalid mode rejection in apps/api/src/application/DemoModeService.ts.
- System integration tests: running the API integration test command validates GET /api/v1/mode and POST /api/v1/mode status codes 200 and 400 through the Fastify app boundary.
- Mock data / fixtures: N/A — mode state is a two-value in-memory setting and does not require seeded change or finding fixtures.

**Depends on:** WO-001, WO-003, WO-005, WO-007

### [P0] Expose change read APIs

Add read controllers for change list and change detail so the frontend can render the dashboard and detail screen entirely from backend-owned policy evaluations, gate verdicts, and ledger timelines. The controller implementation belongs in the ChangesController module at apps/api/src/controllers/changesController.ts, with routes for GET /api/v1/changes and GET /api/v1/changes/{id}. This matters because evaluators need to understand why changes such as CHG-1042 are blocked within seconds, and the UI must not compute authoritative governance decisions in the browser. When complete, the list endpoint returns seeded changes with gate verdict summaries suitable for allow and block grouping, while the detail endpoint returns the selected change, findings, active policy evaluation, latest gate verdict, and chronological ledger events. The controller should delegate gate computation to the policy evaluator and read state from the in-memory store instead of duplicating rules in HTTP handlers. This story does not implement state-changing command endpoints, frontend views, reset behavior, mode changes, or ledger creation. It depends on the route registry, seed-backed in-memory data, shared domain types, and the policy evaluation engine. The observable behavior is that GET /api/v1/changes includes CHG-1041 through CHG-1048 and GET /api/v1/changes/CHG-1042 returns a block verdict with a reason tied to the critical secret-handling finding when that finding is open. Error responses for unknown change IDs should use the standard structured 404 envelope.

| Field | Value |
|---|---|
| Story Points | 5 |
| Hours | 50h |
| Priority | P0 |
| Labels | epic:backend-governance, component:controller, component:api, complexity:medium, priority:P0 |

**Acceptance Criteria**
- File inspection of apps/api/src/controllers/changesController.ts shows route handlers or registration functions for GET /api/v1/changes and GET /api/v1/changes/{id}.
- GET /api/v1/changes returns status code 200 with data.changes containing exactly the seeded IDs CHG-1041 through CHG-1048 when the seed data is loaded.
- GET /api/v1/changes includes a gate or verdict field for each change, and the CHG-1042 item has verdict equal to block when its critical finding is open.
- GET /api/v1/changes/CHG-1042 returns status code 200 with data.change.id equal to CHG-1042, a findings array, a policyEvaluation section, a gate verdict section, and a ledgerTimeline array.
- GET /api/v1/changes/NOT-A-CHANGE returns status code 404 with error.code equal to NOT_FOUND in the standard response envelope.
- Unit tests: running the controller unit test filter validates that apps/api/src/controllers/changesController.ts delegates verdict calculation to PolicyEvaluationEngine rather than hard-coding CHG-1042 logic.
- System integration tests: running the API integration test command validates GET /api/v1/changes and GET /api/v1/changes/CHG-1042 through the Fastify app boundary with status code 200.
- Mock data / fixtures: integration tests use committed deterministic seed data containing CHG-1041 through CHG-1048 and do not require external services.

**Depends on:** WO-003, WO-004, WO-005, WO-007, WO-006

### [P0] Reset seeded demo state

Implement a reset service that restores the original ShipGate seed state and returns the backend mode to advisory so presenters can replay the same governance scenario reliably. The application implementation belongs in the ResetService module at apps/api/src/application/ResetService.ts, where it should coordinate the seed loader, in-memory store, and demo mode service without owning HTTP response formatting. This matters because reset reliability is a core demo success metric and stakeholders need CHG-1042, all findings, policies, gates, and ledger evidence to return to deterministic baseline conditions before each walkthrough. When complete, invoking reset through the later controller will replace mutated runtime state with a fresh copy of the seed data and set the mode back to advisory. The reset operation should avoid retaining references to previously mutated arrays or maps so old state cannot leak into the new demo run. This story does not implement the POST /api/v1/reset controller itself, policy evaluation, command transitions, or seed data definitions. It depends on a deterministic seed data loader, an in-memory state store, and a backend-owned mode service with an advisory setter. The observable result is a ResetService method that can be called from tests to mutate data, reset, and then verify seeded IDs, finding statuses, policy configuration, ledger chain baseline, and mode. The service should fail safely by not claiming reset success if seed restoration or mode restoration throws an error.

| Field | Value |
|---|---|
| Story Points | 3 |
| Hours | 30h |
| Priority | P0 |
| Labels | epic:backend-governance, component:application-service, complexity:medium, priority:P0 |

**Acceptance Criteria**
- File inspection of apps/api/src/application/ResetService.ts shows a ResetService export with a reset or resetAll method that calls the SeedDataLoader state restoration capability and DemoModeService setMode with advisory.
- A unit test for apps/api/src/application/ResetService.ts mutates a seeded change state, invokes reset, and asserts change CHG-1042 returns to state IN_REVIEW from the seed data.
- A unit test for apps/api/src/application/ResetService.ts sets mode to enforced through DemoModeService, invokes reset, and asserts DemoModeService.getMode returns advisory.
- A unit test for apps/api/src/application/ResetService.ts mutates a finding status, invokes reset, and asserts the seeded critical finding for CHG-1042 is open again.
- System integration tests: N/A — this story implements the application service only; POST /api/v1/reset integration coverage is added with the demo controller story.
- Mock data / fixtures: reset service tests use the committed deterministic seed data fixture from the SeedDataLoader and do not call external services or random generators.

**Depends on:** WO-002, WO-003, WO-008

### [P0] Enforce backend state transitions

Implement the backend state transition engine so ShipGate owns submit, approve, ship, and finding-resolution behavior with role checks, advisory exceptions, enforced refusals, BLOCKED movement, and RESOLVED behavior. The domain implementation belongs in the StateTransitionEngine module at apps/api/src/domain/StateTransitionEngine.ts, where state rules must be independent of Fastify and reusable by command controllers. This is the highest-risk governance path because enforced mode must prevent approval or shipment when open findings meet or exceed the active policy threshold, while advisory mode must proceed only with explicit exception evidence for the ledger. When complete, Developer can submit DRAFT changes to IN_REVIEW, Approver can approve or ship eligible changes, Security Owner can resolve findings with a non-empty note, and Judge Guest cannot perform state-changing actions through direct backend calls. Enforced refusal of approval or shipment for a blocked change should move or keep the change in BLOCKED and return a refusal reason suitable for ledger evidence. Resolving all blocking findings should move a BLOCKED change to RESOLVED so it can later be approved when policy evaluation allows. This story does not implement HTTP command endpoints, read controllers, frontend role switcher behavior, or seed data construction. It depends on policy evaluation, mode management, domain model definitions, in-memory state, and hash-chained ledger append capability. The observable result is a transition engine with typed results for success and refusal, including from_state, to_state, actor, action, reason, note when provided, and updated aggregate data for controllers to return.

| Field | Value |
|---|---|
| Story Points | 8 |
| Hours | 80h |
| Priority | P0 |
| Labels | epic:backend-governance, component:domain, complexity:high, priority:P0 |

**Acceptance Criteria**
- File inspection of apps/api/src/domain/StateTransitionEngine.ts shows a StateTransitionEngine export that handles submit, approve, ship, and resolveFinding operations without importing Fastify.
- A unit test for apps/api/src/domain/StateTransitionEngine.ts asserts Developer submitting a DRAFT change returns to_state equal to IN_REVIEW and includes an appended ledger event payload with actor equal to Developer.
- A unit test for apps/api/src/domain/StateTransitionEngine.ts asserts Approver approval of CHG-1042-style data in enforced mode returns a refused result, sets to_state equal to BLOCKED, and includes a reason referencing an open critical or high blocking finding.
- A unit test for apps/api/src/domain/StateTransitionEngine.ts asserts Approver approval of the same blocked data in advisory mode returns a success result and includes a reason or note text containing advisory mode exception evidence.
- A unit test for apps/api/src/domain/StateTransitionEngine.ts asserts Security Owner resolving a finding with a whitespace-only note is rejected and the finding status remains open.
- A unit test for apps/api/src/domain/StateTransitionEngine.ts asserts resolving all blocking findings for a BLOCKED change returns to_state equal to RESOLVED.
- A unit test for apps/api/src/domain/StateTransitionEngine.ts asserts Judge Guest submit, approve, ship, and resolveFinding attempts return forbidden refusal results and do not create successful state transitions.
- System integration tests: N/A — this story implements the domain engine only; POST command endpoint integration coverage is added with the command controller story.
- Mock data / fixtures: committed transition test fixtures include DRAFT, IN_REVIEW, BLOCKED, RESOLVED, APPROVED, and SHIPPED change states plus open and resolved high or critical findings.

**Depends on:** WO-003, WO-004, WO-006, WO-008

### [P0] Expose policies and reset APIs

Add demo controllers for policy listing and reset so evaluators can inspect governance rules and presenters can restore the deterministic ShipGate scenario through backend-owned REST endpoints. The controller implementation belongs in the DemoController module at apps/api/src/controllers/demoController.ts, with GET /api/v1/policies and POST /api/v1/reset registered under the versioned API route system. This matters because the product must make the seeded Secrets must not ship policy visible while also supporting repeatable demos where all changes, findings, gates, ledger events, and mode return to baseline. When complete, GET /api/v1/policies returns active policy metadata including name, description, block_severity_threshold, and owner_role, and POST /api/v1/reset invokes ResetService and returns advisory mode with reset counts. Reset must be driven by the backend, not by frontend cache clearing, so API clients can verify restored seed state immediately after the request. This story does not implement policy CRUD, arbitrary seed editing, transition commands, or frontend policy list and reset controls. It depends on the route registry, response envelope, policy evaluator context, deterministic seed state, and ResetService. The observable behavior is that POST /api/v1/reset followed by GET /api/v1/mode and GET /api/v1/changes/CHG-1042 shows advisory mode and restored seeded blocked-change evidence. The controller should treat reset as a demo operation and return structured errors if restoration fails rather than partially claiming success.

| Field | Value |
|---|---|
| Story Points | 3 |
| Hours | 30h |
| Priority | P0 |
| Labels | epic:backend-governance, component:controller, component:api, complexity:medium, priority:P0 |

**Acceptance Criteria**
- File inspection of apps/api/src/controllers/demoController.ts shows route handlers or registration functions for GET /api/v1/policies and POST /api/v1/reset.
- GET /api/v1/policies returns status code 200 with data.policies containing the seeded policy name Secrets must not ship, block_severity_threshold equal to high-and-above or its domain equivalent, and owner_role equal to Security Owner.
- POST /api/v1/reset returns status code 200 with data.mode equal to advisory and data.counts containing changes, findings, policies, gates, or ledger_events counts from the restored seed state.
- After mutating mode to enforced with POST /api/v1/mode, POST /api/v1/reset followed by GET /api/v1/mode returns data.mode equal to advisory.
- After a state-changing command mutates CHG-1042 or one of its findings, POST /api/v1/reset followed by GET /api/v1/changes/CHG-1042 returns seeded state IN_REVIEW and the critical finding status open.
- Unit tests: running the controller unit test filter validates that apps/api/src/controllers/demoController.ts delegates reset to ResetService and does not manually reconstruct seed data in the controller.
- System integration tests: running the API integration test command validates GET /api/v1/policies and POST /api/v1/reset through the Fastify app boundary with status code 200 and standard envelopes.
- Mock data / fixtures: integration tests use committed deterministic seed data with the Secrets must not ship policy and CHG-1042 seeded findings.

**Depends on:** WO-005, WO-007, WO-006, WO-010

### [P0] Expose transition command APIs

Add command controllers for submit, approve, ship, and finding resolution so all state-changing ShipGate actions go through backend-owned enforcement rather than frontend mutation. The controller implementation belongs in the TransitionController module at apps/api/src/controllers/transitionController.ts, with POST routes for /api/v1/changes/{id}/submit, /api/v1/changes/{id}/approve, /api/v1/changes/{id}/ship, and /api/v1/findings/{findingId}/resolve. This matters because ShipGate’s core value is proving that a direct REST call cannot bypass role checks, mode behavior, policy thresholds, or ledger evidence. When complete, each command validates the selected demo role, validates params and note input, delegates to StateTransitionEngine, and returns updated change evidence or a structured refusal response. Enforced-mode approval or shipment of a change with an open high or critical finding should return a conflict response with a ledger-backed refusal reason, while advisory mode should return success with explicit exception evidence from the engine. Resolving a finding requires a trimmed non-empty note and should reject whitespace-only notes with status code 400. This story does not implement the transition rules themselves, policy evaluator internals, frontend buttons, seed data, or read endpoints. It depends on the versioned route registry, structured envelopes, and a complete state transition engine with ledger append behavior. The observable behavior is that API clients can run the full backend command flow and receive deterministic status codes, updated state, gate verdicts, and ledger event references.

| Field | Value |
|---|---|
| Story Points | 5 |
| Hours | 50h |
| Priority | P0 |
| Labels | epic:backend-governance, component:controller, component:api, complexity:medium, priority:P0 |

**Acceptance Criteria**
- File inspection of apps/api/src/controllers/transitionController.ts shows POST handlers for /api/v1/changes/{id}/submit, /api/v1/changes/{id}/approve, /api/v1/changes/{id}/ship, and /api/v1/findings/{findingId}/resolve.
- POST /api/v1/changes/CHG-1041/submit with body containing role Developer returns status code 200 or 201 with data.change.state equal to IN_REVIEW when CHG-1041 is in DRAFT.
- POST /api/v1/changes/CHG-1042/approve with body containing role Approver while mode is enforced returns status code 409 with error.code or data.refused equal to a policy conflict indicator and the response includes a refusal reason.
- POST /api/v1/changes/CHG-1042/approve with body containing role Judge Guest returns status code 403 and does not return data.change.state equal to APPROVED.
- POST /api/v1/findings/{findingId}/resolve with body containing role Security Owner and a whitespace-only note returns status code 400 with an error message referencing note validation.
- POST /api/v1/findings/{findingId}/resolve with body containing role Security Owner and a non-empty note returns status code 200 and data.finding.status equal to resolved for an open finding.
- Unit tests: running the controller unit test filter validates that apps/api/src/controllers/transitionController.ts maps StateTransitionEngine forbidden, validation, not-found, and conflict results to HTTP 403, 400, 404, and 409 respectively.
- System integration tests: running the API integration test command validates submit, enforced approve refusal, Judge Guest denial, and resolve finding note validation through the Fastify app boundary.
- Mock data / fixtures: integration tests use committed seed data with a DRAFT change, CHG-1042 blocked findings, and at least one open finding id for resolution tests.

**Depends on:** WO-005, WO-007, WO-011

---

## React SPA API integration, routing, demo role controls, and mode controls

### [P0] Build typed ShipGate API client

Implement a typed ShipGate API client so the React SPA reads and changes demo governance data only through the backend REST boundary, preserving stakeholder trust that release decisions are backend-owned. The work belongs in the ShipGate API client module at apps/web/src/api/shipgateClient.ts. The current frontend integration point should move from any ad hoc fetch usage or missing client abstraction to a single reusable module that knows the versioned /api/v1 endpoints. This matters because policy enforcement accuracy is the primary business outcome, and a centralized client reduces the chance of frontend-side state mutation or endpoint drift during the demo. When complete, views and controls can call functions for changes, policies, current mode, mode updates, reset, submit, approve, ship, and finding resolution, and each function returns typed data or a structured error. The client must surface refused transitions from endpoints such as POST /api/v1/changes/CHG-1042/approve as actionable conflict or forbidden responses rather than swallowing them. This story does not build route views, header controls, visual styling, or backend transition logic. It depends on the backend API already exposing seeded changes, policies, mode management, reset, and command endpoints with structured JSON responses. The implementation should keep the API boundary observable for developers by making endpoint paths, request bodies, and error mapping easy to inspect in one file. It should also commit deterministic response fixtures so unit and integration tests do not depend on a live backend for every assertion.

| Field | Value |
|---|---|
| Story Points | 5 |
| Hours | 50h |
| Priority | P0 |
| Labels | epic:react-spa-api-integration, frontend, api-client, complexity:medium |

**Acceptance Criteria**
- File inspection of apps/web/src/api/shipgateClient.ts shows exported functions named listChanges, getChange, listPolicies, getMode, setMode, resetDemo, submitChange, approveChange, shipChange, and resolveFinding that call /api/v1/changes, /api/v1/changes/{id}, /api/v1/policies, /api/v1/mode, /api/v1/reset, /api/v1/changes/{id}/submit, /api/v1/changes/{id}/approve, /api/v1/changes/{id}/ship, and /api/v1/changes/{changeId}/findings/{findingId}/resolve.
- File inspection of apps/web/src/api/shipgateClient.ts shows command requests include the selected demo role as an allow-listed value in the request body or X-ShipGate-Demo-Role header for submitChange, approveChange, shipChange, and resolveFinding.
- Unit tests for apps/web/src/api/shipgateClient.ts mock fetch and assert that a 409 response from POST /api/v1/changes/CHG-1042/approve is converted into a typed ShipGateApiError containing status 409 and the backend message; running npm test -- shipgateClient exits with code 0.
- System integration coverage validates the service boundary by exercising GET /api/v1/mode, POST /api/v1/mode, GET /api/v1/changes, POST /api/v1/reset, and POST /api/v1/changes/CHG-1042/approve through shipgateClient functions against the test server or route-mocked browser environment, and the test command exits with code 0.
- Mock data and fixtures are committed under apps/web/src/api or an adjacent test fixture directory and include representative JSON for CHG-1042, the seeded policy named Secrets must not ship, advisory mode, enforced mode, a successful ledger event, and a refused transition response.
- File inspection of apps/web/src/api/shipgateClient.ts shows no use of TypeScript any for public request or response types, and untrusted error payloads are parsed through unknown or explicit type guards before messages are exposed.

**Depends on:** WO-008, WO-009, WO-013, WO-012

### [P1] Create ShipGate route shell

Create the React SPA route shell so evaluators can navigate between the dashboard, change detail, policies, and legacy comparison screens without login or page reload friction. The work belongs in the main application module at apps/web/src/App.tsx. The current application entry point should move from an unstructured or placeholder render to a predictable shell that mounts GateDashboardView, ChangeDetailView, PolicyListView, and LegacyView. This enables the core demo journey where a user lands on the gate dashboard, drills into CHG-1042, inspects policy evidence, and compares the legacy rubber-stamp process. When complete, direct navigation to the dashboard, a seeded change detail URL, the policies page, and the legacy page should render the intended route-level view with shared application chrome. The shell should hold only navigation and shared demo context wiring, not policy evaluation, state transitions, or ledger mutation. This story does not implement the detailed panel content inside each view or the header role and mode controls beyond reserving the shell integration points they need. It depends on a typed frontend API client being available so route views have a consistent way to read backend data. It also depends on the route-level view components existing or being stubbed in the project so the shell can compose them without inventing business behavior. The finished route shell should give developers a low-blast-radius place to add loading, not-found, and error boundaries around the demo screens.

| Field | Value |
|---|---|
| Story Points | 3 |
| Hours | 30h |
| Priority | P1 |
| Labels | epic:react-spa-routing, frontend, routing, complexity:medium |

**Acceptance Criteria**
- File inspection of apps/web/src/App.tsx shows registered routes for /, /changes/:changeId, /policies, and /legacy that render GateDashboardView, ChangeDetailView, PolicyListView, and LegacyView respectively.
- Running a route rendering test for apps/web/src/App.tsx asserts that navigating to /changes/CHG-1042 renders a ChangeDetailView route container and preserves the CHG-1042 route parameter.
- Running a route rendering test for apps/web/src/App.tsx asserts that an unknown path such as /not-a-real-route renders a visible not-found state or redirects to / without throwing an uncaught error.
- Unit tests are written for apps/web/src/App.tsx route selection and navigation labels, and running npm test -- App exits with code 0.
- System integration tests open /, /changes/CHG-1042, /policies, and /legacy in the browser and assert route-specific text or landmark labels for Gate Dashboard, Change Detail, Policies, and Legacy view; the browser test command exits with code 0.
- Mock data and fixtures are committed for route tests that need CHG-1042 and policy list responses from apps/web/src/api/shipgateClient.ts; if a specific route test only renders static LegacyView content, the criterion is N/A — static legacy route rendering does not require API fixture data.

**Depends on:** WO-014

### [P1] Add demo role switcher

Implement the AppHeader role switcher so presenters and evaluators can immediately change the selected demo actor and see which governance actions are available for that role. The work belongs in the header module at apps/web/src/components/AppHeader.tsx with shared state wired through apps/web/src/App.tsx as needed. The current header should move from having no verified demo role control to exposing Developer, Approver, Security Owner, and Judge / Guest options with Approver selected by default. This matters because the demo must show that Developers submit changes, Approvers approve or ship eligible changes, Security Owners resolve findings with notes, and Judge / Guest users inspect evidence without state-changing affordances. When complete, changing roles should be immediate, require no login, and update the role value passed to action-capable views and API command helpers. The switcher must be clearly presented as a demo context control rather than authentication, because client-side role selection is not a security boundary. This story does not implement advisory/enforced mode synchronization, backend command endpoints, or the detailed action buttons inside each route view. It depends on the route shell providing a shared header location and a place to propagate selected role to child screens. It should preserve the backend-owned enforcement model by disabling or hiding actions for usability while still expecting the API to refuse unauthorized commands. The finished behavior should be easy to validate with keyboard navigation, screen-reader labels, and deterministic tests for all four role values.

| Field | Value |
|---|---|
| Story Points | 3 |
| Hours | 30h |
| Priority | P1 |
| Labels | epic:demo-role-controls, frontend, accessibility, complexity:medium |

**Acceptance Criteria**
- File inspection of apps/web/src/components/AppHeader.tsx shows a visible role switcher labeled as a demo control with exactly Developer, Approver, Security Owner, and Judge / Guest options.
- A unit test for apps/web/src/components/AppHeader.tsx asserts that the default selected role is Approver on initial render and that selecting Judge / Guest updates the selected role display.
- A unit test for apps/web/src/components/AppHeader.tsx asserts the role switcher is keyboard-operable and has an accessible label referencing the demo role control.
- File inspection of apps/web/src/App.tsx shows selected role state or context is passed from AppHeader to route-level views or shell children without storing it as authenticated identity.
- System integration tests in the browser select Developer, Approver, Security Owner, and Judge / Guest from AppHeader and assert that the visible selected role text changes on /, /changes/CHG-1042, /policies, and /legacy.
- Mock data and fixtures for role-switcher tests are N/A — apps/web/src/components/AppHeader.tsx role selection uses local demo control state and does not require backend data; any route integration using CHG-1042 should reuse the committed API fixtures from apps/web/src/api.

**Depends on:** WO-015

### [P1] Add mode toggle control

Implement the AppHeader advisory/enforced mode toggle so evaluators can compare legacy advisory behavior against deterministic enforced governance using backend-owned mode state. The work belongs in apps/web/src/components/AppHeader.tsx with mode state orchestration in apps/web/src/App.tsx and API calls through apps/web/src/api/shipgateClient.ts. The current header should move from having no verified mode control to reading the current mode with GET /api/v1/mode and updating it with POST /api/v1/mode. This matters because advisory mode explains the baseline where risky actions can proceed with evidence, while enforced mode proves that open high or critical findings cannot be approved or shipped incorrectly. When complete, the header should display the current mode, allow toggling between advisory and enforced, and refresh or notify route views so subsequent commands use backend mode behavior. The UI must not implement the blocking decision locally or present a mode change as successful until the backend POST response succeeds. If mode loading or update fails, users should see a clear error state and the previous known mode should remain visible. This story does not implement transition buttons, ledger event rendering, reset behavior, or policy evaluation panels. It depends on the typed API client exposing getMode and setMode, and on the route shell rendering the header on all demo screens. The completed toggle should be accessible, keyboard-operable, and covered by tests that prove the REST boundary is used.

| Field | Value |
|---|---|
| Story Points | 3 |
| Hours | 30h |
| Priority | P1 |
| Labels | epic:mode-controls, frontend, api-integration, accessibility, complexity:medium |

**Acceptance Criteria**
- File inspection of apps/web/src/components/AppHeader.tsx and apps/web/src/App.tsx shows the current mode is loaded through getMode from apps/web/src/api/shipgateClient.ts, which calls GET /api/v1/mode.
- File inspection of apps/web/src/components/AppHeader.tsx shows a visible advisory/enforced mode toggle labeled as a demo mode control and not as a security or production enforcement setting.
- A unit test for apps/web/src/components/AppHeader.tsx asserts that selecting enforced triggers setMode with endpoint behavior for POST /api/v1/mode and payload containing mode enforced.
- A unit test for apps/web/src/components/AppHeader.tsx asserts that when POST /api/v1/mode fails with status 400 or 500, the displayed mode remains the previous value and an error message is rendered.
- System integration tests load /changes/CHG-1042, verify GET /api/v1/mode is requested on app load, toggle enforced through AppHeader, and verify POST /api/v1/mode is requested before the UI displays enforced as current.
- Mock data and fixtures are committed for GET /api/v1/mode advisory, GET /api/v1/mode enforced, POST /api/v1/mode success, and POST /api/v1/mode error responses under apps/web/src/api or the browser test fixture directory.

**Depends on:** WO-014, WO-015

### [P1] Add demo safety labels

Add persistent demo and non-production labels plus role-permission helper text so users do not mistake ShipGate’s role and mode controls for real authentication or production audit retention. The work belongs in apps/web/src/components/AppHeader.tsx and apps/web/src/components/AppShell.tsx. The current shell and header should move from relying on implicit demo context to showing clear, repeated copy that frames ShipGate as an unauthenticated non-production release-governance demo. This matters because stakeholders must understand the product value without overestimating the MVP’s identity, retention, or durability guarantees. When complete, every screen should show non-production labeling, the role switcher should explain who can submit, approve, ship, resolve, or view only, and the mode toggle should explain advisory versus enforced behavior at a high level. The helper text should support policy enforcement comprehension while still stating that the backend is authoritative for actual transition outcomes. This story does not add new roles, implement the mode toggle, create authentication, change backend enforcement, or alter the audit ledger data model. It depends on the header already containing role and mode controls and the app shell already wrapping all route screens. The final copy should be accessible to screen readers, visible at mobile and desktop widths, and concise enough not to block the demo flow. This is a trust and compliance story as much as a UI polish story because it reduces the risk of demo controls being misread as production security controls.

| Field | Value |
|---|---|
| Story Points | 2 |
| Hours | 20h |
| Priority | P1 |
| Labels | epic:demo-safety-labeling, frontend, accessibility, compliance, complexity:low |

**Acceptance Criteria**
- File inspection of apps/web/src/components/AppHeader.tsx shows visible copy containing Demo control or equivalent near the role switcher and mode toggle, and it states that no login or real authentication is provided.
- File inspection of apps/web/src/components/AppShell.tsx shows a persistent non-production label or banner that renders on dashboard, change detail, policy list, and legacy routes.
- File inspection of apps/web/src/components/AppHeader.tsx shows role-permission helper text covering Developer submit, Approver approve and ship, Security Owner resolve with note, and Judge / Guest view-only access.
- A unit test for apps/web/src/components/AppHeader.tsx asserts the helper text updates or remains visible when selecting Judge / Guest and includes view-only wording.
- A system integration test opens /, /changes/CHG-1042, /policies, and /legacy and asserts each route contains the non-production label from apps/web/src/components/AppShell.tsx.
- Mock data and fixtures are N/A — apps/web/src/components/AppHeader.tsx and apps/web/src/components/AppShell.tsx label rendering is static or based on local role/mode props and does not require backend data fixtures.

**Depends on:** WO-016, WO-017

---

## Gate Dashboard, Policy List, Legacy View, and responsive navigation

### [P1] Add accessible severity badges

Implement a reusable SeverityBadge component so ShipGate can communicate finding risk consistently and accessibly instead of relying on free-form severity text that evaluators may miss. The change belongs in the SeverityBadge module at apps/web/src/components/SeverityBadge.tsx. This matters because stakeholders need critical, high, medium, low, and informational findings to be scannable across the dashboard and detail screens while still being understandable for screen reader users and color-blind users. When the story is complete, every supported severity renders a stable text label, a severity-specific icon label, and the required color treatment: critical red, high orange, medium yellow, low blue, and info gray. The component should be deterministic and should not fetch data, evaluate policies, mutate state, or append ledger events. The component should avoid accepting arbitrary severity strings beyond the five allowed severity values, because severity classification is part of the release-governance contract. This story does not include wiring the badge into the dashboard or change detail view beyond making the component available for import. It depends on the shared severity vocabulary and the frontend styling baseline already being present so that the component can use the project’s established React and TypeScript patterns.

| Field | Value |
|---|---|
| Story Points | 2 |
| Hours | 20h |
| Priority | P1 |
| Labels | epic:EPIC-04, frontend, accessibility, component, complexity:low |

**Acceptance Criteria**
- File inspection of apps/web/src/components/SeverityBadge.tsx shows an exported SeverityBadge function or component with explicit handling for severity values critical, high, medium, low, and info.
- File inspection of apps/web/src/components/SeverityBadge.tsx shows the required visual mapping: critical uses a red treatment, high uses orange, medium uses yellow, low uses blue, and info uses gray.
- File inspection of apps/web/src/components/SeverityBadge.tsx shows severity is conveyed by visible text and an icon label or aria-label, not color alone.
- Unit tests: running npm test -- SeverityBadge executes apps/web/src/components/SeverityBadge.test.tsx and asserts that each severity label critical, high, medium, low, and info is rendered.
- System integration tests: N/A — apps/web/src/components/SeverityBadge.tsx is a presentational React component and does not call REST endpoints or cross a service boundary.
- Mock data/fixtures: N/A — apps/web/src/components/SeverityBadge.test.tsx can cover all five allowed severity values with inline test cases and no external fixture dependency.
- Running npm run typecheck verifies apps/web/src/components/SeverityBadge.tsx without TypeScript any usage for the severity prop.

**Depends on:** WO-001, WO-015

### [P2] Show active policy list

Implement PolicyListView so users can inspect the active blocking policies that drive ShipGate gate verdicts instead of treating allow and block decisions as opaque system output. The change belongs in the PolicyListView module at apps/web/src/views/PolicyListView.tsx. This matters because release stakeholders and evaluators need to see that the seeded Secrets must not ship policy is the rule behind high-and-above blocking behavior and is owned by the Security Owner role. When the story is complete, the screen lists active policy names, descriptions, block severity thresholds, and owner roles in a scannable responsive layout. The view should read policy metadata from the backend or the existing API client pattern and should not provide create, update, delete, activation, or threshold-edit controls. The view should show an explicit empty state if no active policies are returned, because a blank governance rules page would make the demo look misconfigured. This story does not include policy authoring, policy versioning, backend policy evaluation, or ledger changes. It depends on the seeded policy data and the frontend data-fetching pattern established for read-only REST views.

| Field | Value |
|---|---|
| Story Points | 3 |
| Hours | 30h |
| Priority | P2 |
| Labels | epic:EPIC-04, frontend, policy-visibility, api-read-model, complexity:medium |

**Acceptance Criteria**
- File inspection of apps/web/src/views/PolicyListView.tsx shows that each rendered policy includes name, description, block_severity_threshold, and owner_role fields.
- The policy list read path uses GET /api/v1/policies or the repository’s existing API client wrapper for that endpoint, and apps/web/src/views/PolicyListView.tsx does not include create, update, delete, or activation controls.
- Unit tests: running npm test -- PolicyListView executes apps/web/src/views/PolicyListView.test.tsx and asserts that Secrets must not ship, high-and-above, and Security Owner are rendered from fixture data.
- System integration tests: running npx playwright test apps/web/e2e/policy-list.spec.ts validates that the Policy List route renders data returned from GET /api/v1/policies.
- Mock data/fixtures: apps/web/src/views/__fixtures__/policyList.fixture.ts is committed with the seeded policy name Secrets must not ship, block_severity_threshold high-and-above, and owner_role Security Owner.
- File inspection of apps/web/src/views/PolicyListView.tsx shows an empty-state branch for an empty policies array and an error-state branch for failed GET /api/v1/policies.

**Depends on:** WO-014, WO-015

### [P2] Create legacy approval mock

Implement LegacyView as a deliberately distinct email-thread and meeting-notes mock that shows how CHG-1042 could be rubber-stamped despite a critical secret-handling finding. The change belongs in the LegacyView module at apps/web/src/views/LegacyView.tsx. This matters because ShipGate’s demo must make the contrast between legacy CAB behavior and deterministic backend-enforced gate decisions obvious to judges and stakeholders. When the story is complete, the screen is clearly labeled Legacy view, uses muted email-like styling, includes sender names, timestamps, reply indentation, meeting agenda details, attendees, and action items. The mock must mention CHG-1042 Add vendor export API, the critical secret-handling finding, and an approver message reading LGTM, approved — findings are informational or substantially the same phrase. The content should be static demo copy and should not call backend transition endpoints, create ledger entries, or imply that email approval is part of the authoritative ShipGate workflow. This story does not include implementing a real email integration, importing messages, notification workflows, or state transitions. It depends on the seeded CHG-1042 scenario being stable and on the app shell being able to route evaluators to the legacy comparison screen.

| Field | Value |
|---|---|
| Story Points | 2 |
| Hours | 20h |
| Priority | P2 |
| Labels | epic:EPIC-04, frontend, legacy-comparison, demo-content, complexity:low |

**Acceptance Criteria**
- File inspection of apps/web/src/views/LegacyView.tsx shows a visible page heading or label containing Legacy view.
- File inspection of apps/web/src/views/LegacyView.tsx shows the content includes CHG-1042 and Add vendor export API.
- File inspection of apps/web/src/views/LegacyView.tsx shows the content mentions a critical secret-handling finding and live credential detected in generated specification.
- File inspection of apps/web/src/views/LegacyView.tsx shows an approver message containing LGTM, approved — findings are informational or a substantially equivalent visible phrase.
- Unit tests: running npm test -- LegacyView executes apps/web/src/views/LegacyView.test.tsx and asserts that Legacy view, CHG-1042, critical secret-handling, and the approver approval phrase are rendered.
- System integration tests: N/A — apps/web/src/views/LegacyView.tsx is a static mock and does not call REST endpoints; route navigation coverage belongs to the AppShell navigation story.
- Mock data/fixtures: N/A — the required legacy email and meeting notes copy is static scenario content inside apps/web/src/views/LegacyView.tsx and does not require generated external fixture data.

**Depends on:** WO-015

### [P1] Build grouped gate dashboard

Implement GateDashboardView so evaluators can land on a single queue that groups ShipGate changes by allow and block verdict and immediately understand which releases need attention. The change belongs in the GateDashboardView module at apps/web/src/views/GateDashboardView.tsx. This matters because the product’s core demonstration is that CHG-1042 and any other policy-violating change are not hidden inside an email thread but surfaced in a deterministic governance queue. When the story is complete, the dashboard displays separate allow and block groups, each group shows an exception or finding count, and each change row or card includes ID, title, current state, and a severity/finding summary. Clicking a change should navigate to the existing change detail route instead of mutating local state or making a state transition. The dashboard must consume backend-provided read data and must not independently approve, ship, resolve findings, evaluate policies, or append ledger entries. Empty groups, loading states, and fetch failures should be visible so the UI does not present an unverified allow decision when data is unavailable. This story does not include implementing the change detail screen, role switcher behavior, policy list, legacy mock, or the responsive shell navigation. It depends on the backend read API for seeded changes and gate verdicts, the severity badge component for consistent risk labels, and the application route structure that can open a selected change.

| Field | Value |
|---|---|
| Story Points | 5 |
| Hours | 50h |
| Priority | P1 |
| Labels | epic:EPIC-04, frontend, dashboard, api-read-model, complexity:medium |

**Acceptance Criteria**
- File inspection of apps/web/src/views/GateDashboardView.tsx shows the rendered dashboard has separate allow and block sections identified by gate verdict labels.
- File inspection of apps/web/src/views/GateDashboardView.tsx shows each change entry renders change id, title, state, and a summary of finding severity information.
- File inspection of apps/web/src/views/GateDashboardView.tsx shows change selection uses navigation to a change detail path instead of mutating change state in the component.
- The dashboard read path uses GET /api/v1/changes or the repository’s existing API client wrapper for that endpoint, and apps/web/src/views/GateDashboardView.tsx does not call state-changing endpoints such as /submit, /approve, /ship, or /resolve.
- Unit tests: running npm test -- GateDashboardView executes apps/web/src/views/GateDashboardView.test.tsx and asserts that allow and block groups, exception counts, and a CHG-1042 blocked entry are rendered from fixture data.
- System integration tests: running npx playwright test apps/web/e2e/gate-dashboard.spec.ts validates that loading the dashboard retrieves GET /api/v1/changes and clicking a seeded change such as CHG-1042 opens the change detail route.
- Mock data/fixtures: apps/web/src/views/__fixtures__/gateDashboard.fixture.ts is committed with at least one allow change and one block change, including CHG-1042 with a critical finding summary.

**Depends on:** WO-014, WO-015, WO-018

### [P1] Add responsive app navigation

Implement responsive AppShell navigation so users can move between Gate Dashboard, Change Detail, Policy List, and Legacy View at both mobile and desktop widths without losing the role and mode demo context. The change belongs in the AppShell module at apps/web/src/components/AppShell.tsx. This matters because evaluators must be able to inspect ShipGate’s modern governance views and the legacy comparison quickly, including on a 375px mobile viewport and a 1280px desktop viewport. When the story is complete, the shell exposes clear navigation links for the dashboard, a seeded or current change detail path, policy list, and legacy view, with accessible labels and visible focus states. On desktop, navigation should be visible in a horizontal or sidebar-style layout, while on mobile it should collapse into a usable menu or stacked navigation that does not create horizontal scrolling. The shell must preserve the existing role switcher and mode controls as demo controls and must not implement real authentication, state transitions, or policy evaluation. This story does not include building the individual views, changing backend endpoints, or adding production deployment behavior. It depends on the dashboard, change detail, policy list, legacy view, and role or mode header controls already existing so the shell can route to them reliably.

| Field | Value |
|---|---|
| Story Points | 5 |
| Hours | 50h |
| Priority | P1 |
| Labels | epic:EPIC-04, frontend, navigation, responsive, accessibility, complexity:medium |

**Acceptance Criteria**
- File inspection of apps/web/src/components/AppShell.tsx shows navigation entries for Gate Dashboard, Change Detail, Policy List, and Legacy View.
- File inspection of apps/web/src/components/AppShell.tsx shows accessible navigation semantics such as a nav element or aria-label for the primary navigation region.
- File inspection of apps/web/src/components/AppShell.tsx shows the shell preserves visible demo role and mode controls rather than replacing them with authentication UI.
- Running npx playwright test apps/web/e2e/responsive-navigation.spec.ts verifies that at viewport width 375px the AppShell navigation can open Gate Dashboard, Policy List, and Legacy View without document.body.scrollWidth exceeding window.innerWidth.
- Running npx playwright test apps/web/e2e/responsive-navigation.spec.ts verifies that at viewport width 1280px the AppShell navigation displays Gate Dashboard, Change Detail, Policy List, and Legacy View entries without requiring the mobile menu interaction.
- Unit tests: running npm test -- AppShell executes apps/web/src/components/AppShell.test.tsx and asserts that all four navigation destinations render with accessible names.
- System integration tests: running npx playwright test apps/web/e2e/responsive-navigation.spec.ts validates route transitions among /, the change detail route for CHG-1042, /policies, and /legacy in the running SPA.
- Mock data/fixtures: apps/web/e2e/fixtures/navigationSeed.ts or the existing seeded backend state is committed or referenced so responsive navigation tests can open CHG-1042 without external dependencies.

**Depends on:** WO-015, WO-021, WO-022, WO-019, WO-020

---

## Change Detail evidence panels and state-changing frontend actions

### [P1] Render change evidence panels

Implement the Change Detail evidence panels so evaluators can inspect findings, active policy evaluation, and the current gate verdict without relying on meetings or email threads. The work belongs in the ChangeDetailView module at apps/web/src/views/ChangeDetailView.tsx. The current target is a React and TypeScript detail screen that reads backend-owned evidence instead of deriving release decisions in the browser. This matters because ShipGate must make the final allow or block decision transparent enough for stakeholders to understand why CHG-1042 is blocked within a short demo flow. When complete, the screen shows a findings list with category, severity badge, status, and detail text; a policy evaluation panel with threshold and triggered status; and a gate verdict panel with verdict, reason, decided_by, and timestamp. Severity is conveyed with text and accessible color treatment, with critical red, high orange, medium yellow, low blue, and info gray. The view must include loading, not-found, and fetch-error states so a failed evidence request never presents an unverified allow decision. This story does not implement the ledger timeline, state-changing action buttons, role switcher, reset behavior, or backend transition rules. It depends on the backend read API, seeded change and finding data, policy evaluation responses, and existing route/navigation capability being available. The implementation should preserve the architecture rule that the frontend displays evidence from synchronous REST responses and does not mutate authoritative change state.

| Field | Value |
|---|---|
| Story Points | 5 |
| Hours | 50h |
| Priority | P1 |
| Labels | epic:change-detail, frontend, evidence, accessibility, complexity:medium |

**Acceptance Criteria**
- File inspection of apps/web/src/views/ChangeDetailView.tsx shows it requests detail evidence from GET /api/v1/changes/{id} and renders sections with accessible headings matching Findings, Policy evaluation, and Gate verdict.
- A unit test in apps/web/src/views/ChangeDetailView.test.tsx asserts that CHG-1042 renders the text live credential detected in generated specification, a critical severity badge, the policy name Secrets must not ship, and a block verdict from the supplied fixture.
- A unit test in apps/web/src/views/ChangeDetailView.test.tsx asserts severity class mappings for critical, high, medium, low, and info are applied in apps/web/src/views/ChangeDetailView.tsx and that each badge includes visible severity text.
- A system integration test in apps/web/e2e/change-detail.spec.ts opens /changes/CHG-1042, waits for GET /api/v1/changes/CHG-1042, and asserts the page contains Gate verdict, Policy evaluation, Findings, block, and critical.
- Mock data and fixtures are generated and committed under apps/web/src/views/__fixtures__/changeDetail.ts with a CHG-1042 fixture containing findings, policy evaluation, and gate verdict fields; the fixture is imported by apps/web/src/views/ChangeDetailView.test.tsx.
- Running npm test -- apps/web/src/views/ChangeDetailView.test.tsx and npm run test:e2e -- apps/web/e2e/change-detail.spec.ts exits with status code 0.

**Depends on:** WO-014, WO-015, WO-018

### [P1] Reset demo from header

Implement the reset demo control so presenters can restore the seeded ShipGate scenario and advisory mode from the application header during repeated demos. The work belongs in the AppHeader module at apps/web/src/components/AppHeader.tsx. The current target is the global header that already owns demo controls such as role and mode visibility, extended with a reset command that calls the backend rather than clearing client state. This matters because evaluators need a reliable way to replay CHG-1042 and other seeded changes without manual browser refreshes or hidden setup steps. When complete, the header includes a clearly labeled Reset demo control that calls POST /api/v1/reset, shows pending and outcome feedback, then re-fetches GET /api/v1/mode and GET /api/v1/changes or triggers the app’s existing data refresh path. A successful reset must make advisory mode visible again and restore the seeded change list, including stable IDs CHG-1041 through CHG-1048. A reset failure must leave the current UI state visible and show an actionable error message rather than partially clearing data. This story does not implement backend reset behavior, seed data construction, policy evaluation logic, or change detail action buttons. It depends on the backend reset endpoint, mode endpoint, seeded change list endpoint, and the existing header demo-control wiring. The implementation should keep reset as a demo control and avoid over-claiming production disaster recovery or durable audit retention.

| Field | Value |
|---|---|
| Story Points | 3 |
| Hours | 30h |
| Priority | P1 |
| Labels | epic:demo-controls, frontend, reset, operability, complexity:medium |

**Acceptance Criteria**
- File inspection of apps/web/src/components/AppHeader.tsx shows a resetDemo handler that calls POST /api/v1/reset and, after status code 200, triggers re-fetch of GET /api/v1/mode and GET /api/v1/changes or invokes named callbacks that perform those endpoint refreshes.
- A unit test in apps/web/src/components/AppHeader.test.tsx asserts clicking the Reset demo control sends POST /api/v1/reset, disables the control while pending, and calls the mode and change-list refresh callbacks after a mocked 200 response.
- A unit test in apps/web/src/components/AppHeader.test.tsx asserts a mocked POST /api/v1/reset failure renders an error message containing reset failed and does not call the success refresh callback.
- A system integration test in apps/web/e2e/reset-demo.spec.ts mutates visible state through a supported action or mocked route flow, clicks Reset demo in apps/web/src/components/AppHeader.tsx, observes POST /api/v1/reset with status code 200, observes GET /api/v1/mode returning advisory, and asserts CHG-1041 through CHG-1048 are visible again from GET /api/v1/changes.
- Mock data and fixtures are generated and committed under apps/web/src/components/__fixtures__/appHeader.ts with successful reset response, failed reset response, advisory mode response, and seeded changes response cases.
- Running npm test -- apps/web/src/components/AppHeader.test.tsx and npm run test:e2e -- apps/web/e2e/reset-demo.spec.ts exits with status code 0.

**Depends on:** WO-012, WO-014, WO-017, WO-021

### [P1] Show ledger hash timeline

Implement the ledger timeline so users can inspect chronological state evidence and see whether the audit chain is continuous for a change. The work belongs in the LedgerTimeline module at apps/web/src/components/LedgerTimeline.tsx. The current target is a reusable React component consumed by the change detail experience after the read API exposes ledger events. This matters because ShipGate’s control narrative depends on visible evidence for successful and refused transitions, including the prior hash linkage that makes the in-app ledger tamper-evident for the demo. When complete, the timeline shows each event with from_state, to_state, actor, timestamp, note, prev_hash, and hash-chain continuity status. The component should sort or render events chronologically according to the API contract and should visually distinguish a genesis event, a continuous link, and a detected mismatch when enough hash data is present. It must support mobile layouts without horizontal scrolling by wrapping long hash values and providing shortened display text with accessible full-value labels. This story does not implement state transitions, hash calculation, backend ledger append behavior, reset, or action buttons. It depends on the change detail data surface and backend ledger events including timestamps, prev_hash, and event hash evidence where available. The implementation should treat ledger data as read-only evidence and avoid implying production-grade immutable storage beyond the visible in-app demo ledger.

| Field | Value |
|---|---|
| Story Points | 5 |
| Hours | 50h |
| Priority | P1 |
| Labels | epic:change-detail, frontend, audit-ledger, accessibility, complexity:medium |

**Acceptance Criteria**
- File inspection of apps/web/src/components/LedgerTimeline.tsx shows it renders from_state, to_state, actor, timestamp, note, prev_hash, and chain continuity status for each ledger event passed to the component.
- A unit test in apps/web/src/components/LedgerTimeline.test.tsx asserts that a fixture with prev_hash equal to the prior event hash renders Chain continuous for the second event.
- A unit test in apps/web/src/components/LedgerTimeline.test.tsx asserts that a fixture with prev_hash not equal to the prior event hash renders Chain mismatch for the affected event.
- A system integration test in apps/web/e2e/ledger-timeline.spec.ts opens /changes/CHG-1042 and asserts the Ledger timeline region contains actor, timestamp, prev_hash, and at least one continuity label from GET /api/v1/changes/CHG-1042.
- Mock data and fixtures are generated and committed under apps/web/src/components/__fixtures__/ledgerEvents.ts with genesis, continuous, and mismatch event examples used by apps/web/src/components/LedgerTimeline.test.tsx.
- Running npm test -- apps/web/src/components/LedgerTimeline.test.tsx and npm run test:e2e -- apps/web/e2e/ledger-timeline.spec.ts exits with status code 0.

**Depends on:** WO-014, WO-015, WO-023

### [P1] Add developer submit action

Implement the Developer submit action so a permitted demo user can move a draft change into review through the backend transition endpoint. The work belongs in the ChangeDetailActions module at apps/web/src/components/ChangeDetailActions.tsx. The current target is a React action component that receives the selected demo role and current change state from the surrounding detail page. This matters because ShipGate’s frontend must never mutate state directly, and a submit action is the first visible proof that state transitions are owned by the API and recorded in ledger evidence. When complete, a Developer viewing a DRAFT change sees a Submit for review action that calls POST /api/v1/changes/{id}/submit with the selected actor role. The component shows a pending state during the request, displays success feedback from the response, and triggers a detail re-fetch so the new state, gate evidence, and ledger timeline come from the backend. Non-Developer roles must see the action hidden or disabled with explanatory text, and Judge / Guest must not receive an enabled state-changing control. This story does not implement approve, ship, resolve finding, reset, backend transition logic, or ledger hashing. It depends on the role switcher capability, the change detail view, the backend submit endpoint, and the read API used after a transition. The implementation should treat the selected role as demo input sent to the backend, not as authentication or a trusted client-side authorization boundary.

| Field | Value |
|---|---|
| Story Points | 3 |
| Hours | 30h |
| Priority | P1 |
| Labels | epic:change-actions, frontend, state-transition, complexity:medium |

**Acceptance Criteria**
- File inspection of apps/web/src/components/ChangeDetailActions.tsx shows a submitChange handler that calls POST /api/v1/changes/{id}/submit and does not directly assign change.state or mutate findings, gates, or ledger_events in frontend state.
- A unit test in apps/web/src/components/ChangeDetailActions.test.tsx asserts that role Developer and state DRAFT renders an enabled Submit for review button and that clicking it sends POST /api/v1/changes/CHG-1041/submit with actor role Developer.
- A unit test in apps/web/src/components/ChangeDetailActions.test.tsx asserts that role Approver or Judge / Guest does not render an enabled Submit for review button for a DRAFT change and shows explanatory text containing Developer.
- A system integration test in apps/web/e2e/change-submit.spec.ts opens a draft seeded change, selects Developer, clicks Submit for review, observes POST /api/v1/changes/{id}/submit with status code 200, and asserts the detail page re-fetches GET /api/v1/changes/{id}.
- Mock data and fixtures are generated and committed under apps/web/src/components/__fixtures__/changeActions.ts with DRAFT and IN_REVIEW change states and Developer, Approver, Security Owner, and Judge / Guest role cases.
- Running npm test -- apps/web/src/components/ChangeDetailActions.test.tsx and npm run test:e2e -- apps/web/e2e/change-submit.spec.ts exits with status code 0.

**Depends on:** WO-013, WO-014, WO-016, WO-023

### [P1] Resolve finding with note

Implement the Security Owner resolve finding dialog so blocking findings can be resolved only with documented rationale. The work belongs in the ResolveFindingDialog module at apps/web/src/components/ResolveFindingDialog.tsx. The current target is a React dialog launched from the change detail context for an open finding, using backend transition behavior for the actual status update. This matters because ShipGate’s governance evidence must show that a blocked change became eligible through accountable security-owner action rather than silent client-side editing. When complete, Security Owner users can open a dialog for an open finding, enter a non-empty note, submit it to the resolve endpoint, and then see refreshed finding status, gate verdict, and ledger evidence from the backend. Empty and whitespace-only notes must be rejected in the dialog before the request is sent, with an accessible validation message that keeps focus in the dialog. Non-Security Owner roles must not receive an enabled resolve control, and crafted requests are still expected to be enforced by the backend. This story does not implement backend finding resolution, policy recalculation, ledger hash creation, approve and ship actions, or reset. It depends on the change detail findings panel, selected role capability, backend resolve endpoint, and detail refresh behavior after a mutation. The implementation should safely render user-entered notes and avoid logging or exposing sensitive note text beyond the intended in-app evidence display.

| Field | Value |
|---|---|
| Story Points | 5 |
| Hours | 50h |
| Priority | P1 |
| Labels | epic:change-actions, frontend, security-owner, validation, complexity:medium |

**Acceptance Criteria**
- File inspection of apps/web/src/components/ResolveFindingDialog.tsx shows note validation that trims the textarea value and blocks submission when the trimmed length is 0 before calling POST /api/v1/changes/{id}/findings/{findingId}/resolve.
- A unit test in apps/web/src/components/ResolveFindingDialog.test.tsx asserts that submitting an empty note or whitespace-only note renders a validation message containing note is required and does not call POST /api/v1/changes/CHG-1042/findings/{findingId}/resolve.
- A unit test in apps/web/src/components/ResolveFindingDialog.test.tsx asserts that role Security Owner with a non-empty note calls POST /api/v1/changes/CHG-1042/findings/{findingId}/resolve with the trimmed note and triggers the refresh callback on status code 200.
- A unit test in apps/web/src/components/ResolveFindingDialog.test.tsx asserts that Developer, Approver, and Judge / Guest role cases do not render an enabled Resolve finding submit button.
- A system integration test in apps/web/e2e/resolve-finding.spec.ts opens /changes/CHG-1042, selects Security Owner, opens Resolve finding for the critical secret-handling finding, verifies whitespace validation, submits a non-empty note, observes POST /api/v1/changes/CHG-1042/findings/{findingId}/resolve with status code 200, and asserts the detail page re-fetches GET /api/v1/changes/CHG-1042.
- Mock data and fixtures are generated and committed under apps/web/src/components/__fixtures__/resolveFinding.ts with open finding, resolved finding, empty note, whitespace note, valid note, forbidden-role response, and successful response cases.
- Running npm test -- apps/web/src/components/ResolveFindingDialog.test.tsx and npm run test:e2e -- apps/web/e2e/resolve-finding.spec.ts exits with status code 0.

**Depends on:** WO-013, WO-014, WO-016, WO-023

### [P1] Add approver approve ship actions

Implement Approver approve and ship actions so eligible changes can progress through backend-owned governance while blocked changes show clear advisory or enforced feedback. The work belongs in the ChangeDetailActions module at apps/web/src/components/ChangeDetailActions.tsx. The current target is the same action surface used by submit, extended for Approver role behavior and current advisory or enforced mode. This matters because ShipGate’s core stakeholder promise is that a critical finding cannot be rubber-stamped in enforced mode, while advisory mode remains available as a clearly labeled demo baseline. When complete, an Approver can call POST /api/v1/changes/{id}/approve and POST /api/v1/changes/{id}/ship from the detail view when those actions are applicable to the current state. In advisory mode, an approval or shipment with open blocking findings may succeed but must display explicit exception feedback returned by the backend and refresh the ledger timeline. In enforced mode, a blocked approval or shipment must surface the refusal reason from the backend, retain the refreshed backend state such as BLOCKED, and make the newly appended refusal ledger evidence visible after re-fetch. The component must disable or explain these actions for Developer, Security Owner, and Judge / Guest roles. This story does not implement backend policy enforcement, ledger hashing, finding resolution, submit behavior, or reset. It depends on the mode control capability, the change detail evidence surface, the ledger timeline, and backend transition endpoints that record both successful and refused attempts.

| Field | Value |
|---|---|
| Story Points | 8 |
| Hours | 80h |
| Priority | P1 |
| Labels | epic:change-actions, frontend, policy-enforcement, audit-ledger, complexity:high |

**Acceptance Criteria**
- File inspection of apps/web/src/components/ChangeDetailActions.tsx shows approveChange and shipChange handlers that call POST /api/v1/changes/{id}/approve and POST /api/v1/changes/{id}/ship without directly mutating change.state, gates, findings, or ledger_events.
- A unit test in apps/web/src/components/ChangeDetailActions.test.tsx asserts that role Approver renders enabled approve or ship controls only for applicable states and that Judge / Guest renders no enabled approve or ship button.
- A unit test in apps/web/src/components/ChangeDetailActions.test.tsx asserts that a mocked 409 response from POST /api/v1/changes/CHG-1042/approve displays the backend refusal reason and calls the detail refresh callback.
- A unit test in apps/web/src/components/ChangeDetailActions.test.tsx asserts that a mocked advisory success response containing exception text displays advisory mode exception feedback for POST /api/v1/changes/CHG-1042/ship.
- A system integration test in apps/web/e2e/approver-actions.spec.ts sets enforced mode, opens /changes/CHG-1042 as Approver, clicks approve, observes POST /api/v1/changes/CHG-1042/approve returning status code 409, and asserts the refreshed page shows BLOCKED or refusal reason plus a Ledger timeline entry.
- A system integration test in apps/web/e2e/approver-actions.spec.ts sets advisory mode, opens /changes/CHG-1042 as Approver, clicks approve or ship when applicable, observes POST /api/v1/changes/CHG-1042/approve or POST /api/v1/changes/CHG-1042/ship returning status code 200, and asserts advisory exception feedback is visible.
- Mock data and fixtures are generated and committed under apps/web/src/components/__fixtures__/changeActions.ts with Approver action responses for allowed success, advisory exception success, enforced refusal, forbidden role, and invalid state conflict.
- Running npm test -- apps/web/src/components/ChangeDetailActions.test.tsx and npm run test:e2e -- apps/web/e2e/approver-actions.spec.ts exits with status code 0.

**Depends on:** WO-013, WO-014, WO-016, WO-017, WO-023, WO-026