/*
 * ShipGate — release governance that turns advisory findings into enforced blocking gates, as a
 * versioned model.
 *
 * THE CODE IS THE SOURCE, AND EVERY COMPONENT SAYS WHICH FILE IT IS. The first version of this model
 * was transcribed from Forge's architecture artifact before any code existed; this one is read from
 * server/ and web/src/ as landed on main (173b66e..1971ad3). Each component carries a "code"
 * property naming its files, and architecture/drift.mjs refuses a push where the two disagree: a
 * source file no component claims, a component whose file is gone, or an import between two
 * components the model draws no line for.
 *
 * WHAT CHANGED FROM THE ARTIFACT, because the code decided differently:
 *   - One governance engine (server/engine.ts) owns the state machine, the role checks, the policy
 *     gates, the mode and the in-memory maps. The artifact's separate role guard, mode service,
 *     policy engine and store are methods and fields of that one class, so they are not boxes here.
 *   - The AI layer exists (server/ai.ts) and is deterministic: no LLM calls, grounded in live data.
 *   - It deploys to Render as one process, not to ECS through Forge Shipping (decisions 8 and 9).
 *   - There is an Audit ledger page with chain verification.
 *
 * SHARED, NOT DRAWN: server/domain.ts (types and enums every module imports) and web/src/ui.tsx
 * (badges and formatters every page imports). A line to them from everything says nothing.
 *
 * THE TRACES ARE FOUR BECAUSE A DYNAMIC VIEW CANNOT BRANCH. engine.approve() splits on mode; the
 * advisory baseline and the enforced refusal are separate stories, the Security Owner's resolution is
 * the third, and the assistant explaining the block is the fourth.
 */
workspace "ShipGate" "Release governance: advisory findings become enforced blocking gates with a hash-chained evidence ledger." {

    !adrs adrs

    model {
        developer = person "Developer" "Submits changes and watches their governance status."
        approver = person "Approver" "Approves and ships changes; the default demo role."
        securityOwner = person "Security Owner" "Resolves blocking findings with a written note."
        judge = person "Judge / Guest" "Inspects every screen and the ledger; may change nothing."

        forge = softwareSystem "Opsera Forge" "Generated the specification and work orders WO-001 to WO-029 this app implements." {
            tags "Existing System"
        }

        shipgate = softwareSystem "ShipGate" "Evaluates each change against blocking policies and records every decision in a hash-chained ledger." {

            spa = container "Web app" "Gate dashboard, change detail, policies, audit ledger and legacy mock; owns no governance state." "React 18 · TypeScript · Vite" {
                appShell = component "App shell" "Role switcher, advisory/enforced toggle, Reset demo, and hash routing." "React" {
                    properties {
                        "code" "web/src/App.tsx,web/src/main.tsx"
                    }
                }
                dashboard = component "Gate dashboard" "Changes grouped by allow and block verdict, and the Security Owner queue." "React" {
                    properties {
                        "code" "web/src/pages/Dashboard.tsx"
                    }
                }
                changeDetail = component "Change detail" "Findings, AI risk summary, gate verdict, BLOCKED banner, resolution, assistant and the change's ledger." "React" {
                    properties {
                        "code" "web/src/pages/ChangeDetail.tsx"
                    }
                }
                policies = component "Policies" "Active blocking policies, and the AI policy suggestion to adopt as a draft." "React" {
                    properties {
                        "code" "web/src/pages/Policies.tsx"
                    }
                }
                ledgerPage = component "Audit ledger" "Every ledger event with its hash link, and whole-chain verification." "React" {
                    properties {
                        "code" "web/src/pages/Ledger.tsx"
                    }
                }
                legacy = component "Legacy view" "A static email-and-meeting mock of CHG-1042 being rubber-stamped." "React" {
                    properties {
                        "code" "web/src/pages/Legacy.tsx"
                    }
                }
                apiClient = component "API client" "The only path from the browser to state; typed against the server's contracts." "TypeScript · fetch" {
                    properties {
                        "code" "web/src/api.ts"
                    }
                }
            }

            api = container "API server" "Owns all mutable state, the policy gates, transitions, reset, the AI layer and the ledger." "Node.js 22 · Fastify 5 · TypeScript" {
                routes = component "REST routes" "Versioned /api/v1 command endpoints and the SPA's static files; decides nothing." "Fastify" {
                    properties {
                        "code" "server/app.ts,server/index.ts"
                    }
                }
                engine = component "Governance engine" "State machine, role checks, policy gates and mode; nothing reaches SHIPPED past an open blocking finding in enforced mode." "TypeScript" {
                    properties {
                        "code" "server/engine.ts"
                    }
                }
                ledger = component "Hash ledger" "Appends each event with the SHA-256 of its predecessor, and verifies the whole chain." "node:crypto" {
                    properties {
                        "code" "server/ledger.ts"
                    }
                }
                ai = component "AI layer" "Risk summaries, finding explanations, assistant answers and policy suggestions, generated deterministically from live data." "TypeScript · no LLM calls" {
                    properties {
                        "code" "server/ai.ts"
                    }
                }
                seed = component "Seed" "CHG-1041 to CHG-1048, ten findings, the policy Secrets must not ship, and a seeded ledger." "TypeScript" {
                    properties {
                        "code" "server/seed.ts"
                    }
                }
            }
        }

        /* PEOPLE USE THE SCREENS. Enduring wording: what each person does with the app, not a step. */
        developer -> changeDetail "Submits a draft change from"
        approver -> dashboard "Scans the queue by verdict in"
        approver -> changeDetail "Approves, ships and asks the assistant from"
        securityOwner -> changeDetail "Resolves blocking findings with a note from"
        securityOwner -> policies "Adopts suggested draft policies from"
        judge -> legacy "Reads the legacy process in"
        judge -> ledgerPage "Verifies the evidence chain in"

        /* INSIDE THE WEB APP. Every line here is an import in web/src. */
        appShell -> dashboard "Routes to"
        appShell -> changeDetail "Routes to"
        appShell -> policies "Routes to"
        appShell -> ledgerPage "Routes to"
        appShell -> legacy "Routes to"
        appShell -> apiClient "Reads and sets mode, and resets, through"
        dashboard -> appShell "Reads the demo role and mode from"
        changeDetail -> appShell "Reads and switches the demo role through"
        policies -> appShell "Reads the demo role from"
        ledgerPage -> appShell "Reads the demo role from"
        dashboard -> apiClient "Fetches grouped changes through"
        changeDetail -> apiClient "Sends commands, questions and verifications through"
        policies -> apiClient "Fetches policies and the suggestion through"
        ledgerPage -> apiClient "Fetches and verifies the ledger through"

        /* THE REST BOUNDARY. */
        apiClient -> routes "Calls commands and reads on" "REST JSON · HTTPS"

        /* INSIDE THE API SERVER. Every line here is a value import in server/, plus ai -> engine,
           which is a type import the AI layer uses to read live state. */
        routes -> engine "Runs every command and read through"
        routes -> ai "Asks for summaries, explanations, answers and suggestions from"
        engine -> ledger "Appends every transition and refusal to, and verifies the chain with" "SHA-256"
        engine -> seed "Rebuilds its state on start and on Reset demo from"
        seed -> ledger "Chains the seeded history with"
        ai -> engine "Reads findings, policies, gates and the ledger from"

        forge -> shipgate "Generated the specification and work orders for"

        deploymentEnvironment "Demo" {
            deploymentNode "Visitor's browser" "No login: every visitor lands as Approver." "Browser" {
                containerInstance spa
            }
            deploymentNode "Render" "Web service, free plan, built with npm run build." "PaaS · Node 22" {
                deploymentNode "shipgate" "One long-running process serves dist/ and the API; health check /api/v1/health." "tsx server/index.ts" {
                    containerInstance api
                }
            }
        }
    }

    views {
        systemContext shipgate "Context" "Who uses ShipGate, and the platform that generated its specification." {
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        container shipgate "Containers" "The browser app owns no state; the API server owns all of it." {
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        component spa "Screens" "The app shell routes to five screens, and every screen reaches state through one client." {
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        component api "Engine" "Routes decide nothing; the engine decides; the ledger records both outcomes." {
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        /* THE BASELINE. Advisory mode: the scanner flagged it and it ships anyway. */
        dynamic api "Advisory" "Baseline: in advisory mode, CHG-1042 ships despite its open CRITICAL finding." {
            properties {
                "structurizr.tooltips" "true"
            }
            approver -> spa "Clicks Approve on CHG-1042 in advisory mode"
            spa -> routes "POST /api/v1/changes/CHG-1042/approve"
            routes -> engine "approve(): Approver, IN_REVIEW, gate blocks, mode advisory"
            engine -> ledger "Appends APPROVED as advisory_exception: open CRITICAL secret handling"
            approver -> spa "Clicks Ship"
            spa -> routes "POST /api/v1/changes/CHG-1042/ship"
            routes -> engine "ship(): re-evaluates the gate, still advisory"
            engine -> ledger "Appends SHIPPED as advisory_exception"
            autoLayout lr 500 400
        }

        /* THE TREATMENT. Enforced mode: the identical approval is refused, and the refusal is evidence. */
        dynamic api "Enforced" "Treatment: the identical approval is refused, cited, routed and recorded." {
            properties {
                "structurizr.tooltips" "true"
            }
            approver -> spa "Clicks Approve on CHG-1042 in enforced mode"
            spa -> routes "POST /api/v1/changes/CHG-1042/approve"
            routes -> engine "approve(): Secrets must not ship blocks on F-2001"
            engine -> ledger "Appends the refusal: IN_REVIEW to BLOCKED, routed to Security Owner"
            routes -> spa "409 POLICY_BLOCKED with the cited policy and the open finding"
            autoLayout lr 500 400
        }

        /* THE RESOLUTION. Only the owning role clears the finding, and the chain shows each hand. */
        dynamic api "Resolve" "The Security Owner resolves with a note; re-approval ships; the ledger reads BLOCKED, RESOLVED, SHIPPED." {
            properties {
                "structurizr.tooltips" "true"
            }
            securityOwner -> spa "Opens CHG-1042 as Security Owner and resolves F-2001 with a note"
            spa -> routes "POST /api/v1/findings/F-2001/resolve"
            routes -> engine "resolveFinding(): note required, gate re-evaluated"
            engine -> ledger "Appends the resolution, then BLOCKED to RESOLVED"
            approver -> spa "Re-approves, then ships"
            spa -> routes "POST approve, then POST ship"
            routes -> engine "approve() and ship(): every gate allows"
            engine -> ledger "Appends APPROVED, then SHIPPED, chained after BLOCKED and RESOLVED"
            autoLayout lr 500 400
        }

        /* THE EXPLANATION. The assistant reads the evidence; the gate makes the decision. */
        dynamic api "Explain" "The assistant answers why CHG-1042 is blocked, citing the live finding, policy and ledger." {
            properties {
                "structurizr.tooltips" "true"
            }
            approver -> spa "Asks: why is CHG-1042 blocked?"
            spa -> routes "POST /api/v1/assistant"
            routes -> ai "answer(CHG-1042, question)"
            ai -> engine "Reads the blocking finding, the policy and the ledger"
            routes -> spa "An answer citing F-2001 and Secrets must not ship"
            autoLayout lr 500 400
        }

        deployment shipgate "Demo" "Deployed" "One process on Render; the SPA runs in the visitor's browser." {
            include *
            autoLayout lr 500 400
        }

        /* GENERATED FROM architecture/theme.json by checks/diagram-contrast.mjs --write.
           Edit the theme, not this block: the check refuses any drift between them. */
        styles {
            element "Element" {
                color #ffffff
                strokeWidth 2
                fontSize 26
            }
            element "Person" {
                shape Person
                background #32433b
                stroke #6fa588
            }
            element "Existing System" {
                background #32433b
                stroke #6fa588
            }
            element "Software System" {
                background #494d97
                stroke #a5a9f0
            }
            element "Container" {
                background #5f64af
                stroke #b9bdf5
            }
            element "Component" {
                background #8b92ce
                stroke #d2d5fa
                color #14162b
            }
            element "Data Store" {
                shape Cylinder
                background #5f64af
                stroke #b9bdf5
            }
            element "Channel" {
                shape Pipe
                background #5f64af
                stroke #b9bdf5
            }
            element "Deployment Node" {
                background #1F2226
                stroke #9aa4b2
                color #ffffff
            }
            element "Infrastructure Node" {
                background #5f64af
                stroke #b9bdf5
                color #ffffff
            }
            element "Modified" {
                stroke #ffb454
                strokeWidth 4
            }
            element "Proposal" {
                stroke #ff2fd0
                strokeWidth 6
            }
            element "Container Instance" {
            }
            element "Software System Instance" {
            }
            relationship "Relationship" {
                color #d7dbe3
                fontSize 24
            }
            relationship "Asynchronous" {
                color #d7dbe3
                fontSize 24
                dashed true
            }
        }
    }
}
