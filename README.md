# ShipGate

Release governance that turns advisory security findings into **enforced blocking gates**, with a
**hash-chained evidence ledger**. Built for SF Enterprise Hackathon 2.0 (Legacy Modernization track)
on Opsera Forge.

This repo holds the architecture as a versioned model, drawn and checked by
[Drawing Office](https://github.com/devpath56/drawing-office).

## What is modelled

| View | Kind | Shows |
|---|---|---|
| Context | system context | four demo roles, ShipGate, and Opsera Forge, which generated the spec |
| Containers | container | the web app owns no state; the API server owns all of it |
| Screens | component | the app shell, five screens, and the one API client they share |
| Engine | component | routes decide nothing, the governance engine decides, the ledger records both, the AI layer explains |
| **Advisory** | feature trace | baseline: CHG-1042 ships despite its open CRITICAL finding |
| **Enforced** | feature trace | the identical approval is refused, cited, routed to Security Owner, and recorded |
| **Resolve** | feature trace | Security Owner resolves with a note; re-approve ships; BLOCKED → RESOLVED → SHIPPED |
| **Explain** | feature trace | the assistant answers "why is CHG-1042 blocked?" from the live finding, policy and ledger |
| Demo | deployment | one process on Render; the SPA runs in the browser |

Ten decisions sit beside the model in `architecture/shipgate/adrs/`. Each accepted one names the code
that implements it; decision 8 (Forge Shipping to ECS) is superseded by decision 9 (Render).

## The model follows the code

Every component names its source files in a `"code"` property, and `architecture/drift.mjs`
compares the two on every push that touches `server/`, `web/src/` or `architecture/`:

| Finding | Means |
|---|---|
| `unclaimed` | a source file no component names |
| `missing` | a component naming a file that no longer exists |
| `unwired` | an import between two components the model draws no line for |

`server/domain.ts` and `web/src/ui.tsx` are shared by nearly every module and are not drawn. Labels,
traces and decisions are intent and cannot be derived from code, so a failing run tells you which
line to write, not what it should say.

```bash
node architecture/drift.mjs
```

## Render it

**Live:** https://devpath56.github.io/ShipGate/ — rebuilt by `.github/workflows/architecture.yml` on
every push to `main` that touches `architecture/`, `server/` or `web/src/`. A pull request runs the
drift check, the build and all 17 Drawing Office checks without deploying, so a model that has
fallen behind the code, or that Drawing Office would refuse, fails the PR.

Locally, this needs Drawing Office checked out beside this repo, plus `structurizr-cli` and Graphviz.

```bash
node ../drawing-office/tools/build.mjs --root .
node ../drawing-office/tools/serve.mjs 8019 --root .
```

Then open http://localhost:8019/architecture/viewer.html. The exported site is derived and not
tracked; `build` puts it back.

## The app

The running ShipGate app lives beside the model: `server/` (Fastify + TypeScript, owns all state)
and `web/` (React SPA, owns none). It implements Forge work orders WO-001 to WO-029 plus the AI layer.

```bash
npm install
npm run build && npm start      # http://localhost:8787
npm test                        # enforcement, ledger-tamper, reset and assistant tests
```

| Demo beat | Where |
|---|---|
| Legacy CAB-by-email mock | Legacy view |
| Advisory: CHG-1042 ships despite its CRITICAL finding | CHG-1042 → Approve → Ship (Advisory) |
| Enforced: identical approval refused, cited, routed | toggle Enforced → Approve |
| Resolve → re-approve → SHIPPED | "Open as Security Owner to resolve" → note → Approver → Approve → Ship |
| Tamper evidence | Verify chain (change detail or Audit ledger) |

Honest boundaries: the findings feed is seeded and labelled **Simulated** in the UI; blocking is
ShipGate's application logic, not native Forge behaviour; the AI layer is a deterministic reasoning
engine over live findings, policies and ledger data (no LLM calls); state is in memory, and
**Reset demo** restores the seed. Deployed as one process (`render.yaml`) because in-memory state
needs a single long-running instance.
