# ShipGate

Release governance that turns advisory security findings into **enforced blocking gates**, with a
**hash-chained evidence ledger**. Built for SF Enterprise Hackathon 2.0 (Legacy Modernization track)
on Opsera Forge.

This repo holds the architecture as a versioned model, drawn and checked by
[Drawing Office](https://github.com/devpath56/drawing-office).

## What is modelled

| View | Kind | Shows |
|---|---|---|
| Context | system context | four demo roles, ShipGate, and Forge Shipping |
| Containers | container | the SPA owns no state; the REST API owns all of it |
| Screens | component | the SPA's screens and the one API client they share |
| Engine | component | controllers delegate, the transition engine decides, the ledger records both |
| **Advisory** | feature trace | baseline: CHG-1042 ships despite its open CRITICAL finding |
| **Enforced** | feature trace | the identical approval is refused, cited, and recorded |
| **Resolve** | feature trace | Security Owner resolves with a note; re-approve ships; BLOCKED → RESOLVED → SHIPPED |
| Demo | deployment | one container on ECS Fargate; the SPA runs in the browser |

Eight decisions sit beside the model in `architecture/shipgate/adrs/`, one per row of the Forge
architecture artifact's decision table, all **Proposed**.

## Source and the calls made

The model is transcribed from Forge's generated architecture artifact (2026-09-23), not invented.
Three gaps in that artifact were closed in `workspace.dsl`, each commented where it lands:

1. The demo role guard is a component: the sequence diagram routes through it and the component diagram omitted it.
2. A controller may append to the ledger: a refused-role event is recorded before the engine is reached.
3. The in-memory store is a component, not a container: it lives inside the API process.

The artifact has no AI layer, so neither does the model.

## Render it

Needs Drawing Office checked out beside this repo, plus `structurizr-cli` and Graphviz.

```bash
node ../drawing-office/tools/build.mjs --root .
node ../drawing-office/tools/serve.mjs 8019 --root .
```

Then open http://localhost:8019/architecture/viewer.html. The exported site is derived and not
tracked; `build` puts it back.
