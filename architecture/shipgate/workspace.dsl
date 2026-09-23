/*
 * ShipGate — release governance that turns advisory findings into enforced blocking gates, as a
 * versioned model.
 *
 * TAKEN FROM FORGE'S ARCHITECTURE ARTIFACT, NOT INVENTED. Every element is a box from that
 * document's component, API and security diagrams, under its own name; every trace step is a hop from
 * its approve-CHG-1042 sequence diagram. Three calls the artifact left open are made here, and each
 * is marked where it lands:
 *
 *   1. THE DEMO ROLE GUARD IS A COMPONENT. The sequence diagram has it as a participant and the
 *      security diagram draws it as "Server Role Guard", but the component diagram omits it. A trace
 *      step must reuse a static relationship, so the guard needs a box.
 *   2. A CONTROLLER MAY APPEND TO THE LEDGER. The sequence appends a refused-role event straight from
 *      the API; the component diagram only has engine -> ledger. The edge is added, not the story.
 *   3. THE STORE IS A COMPONENT, NOT A CONTAINER. It is process-local maps inside the one API process
 *      (ADR 0003); drawing it as a container would claim a deployable unit that does not exist.
 *
 * WHAT IS LEFT OUT. The CI/CD, data-flow and operations flowcharts have no C4 view; Forge Shipping
 * appears once, as the system that builds and deploys the image. App Shell and Severity Badge are
 * presentation leaves and are folded into the views that import them. The handoff's AI layer is not
 * in the artifact, so it is not in the model.
 *
 * THE TRACES ARE THREE BECAUSE A DYNAMIC VIEW CANNOT BRANCH. The artifact's sequence splits on mode
 * with an `alt`; here the advisory baseline and the enforced refusal are separate stories, and the
 * Security Owner's resolution is the third — the demo's villain, then its resolution.
 */
workspace "ShipGate" "Release governance: advisory findings become enforced blocking gates with a hash-chained evidence ledger." {

    !adrs adrs

    model {
        developer = person "Developer" "Submits changes and watches their governance status."
        approver = person "Approver" "Approves and ships changes; the default demo role."
        securityOwner = person "Security Owner" "Resolves blocking findings with a written note."
        judge = person "Judge-Guest" "Inspects every screen and the ledger; may change nothing."

        forge = softwareSystem "Forge Shipping" "Builds, scans, signs and deploys the container image through gated promotion." {
            tags "Existing System"
        }

        shipgate = softwareSystem "ShipGate" "Evaluates each change against blocking policies and records every decision in a hash-chained ledger." {

            spa = container "Single-page app" "Dashboard, change detail, policy list and legacy mock; owns no governance state." "React · TypeScript · Vite" {
                header = component "App header" "The demo role switcher and the advisory/enforced toggle." "React"
                dashboard = component "Gate dashboard" "The change queue grouped by allow and block verdict." "React"
                detail = component "Change detail" "Findings, policy evaluation, gate verdict and the ledger timeline for one change." "React"
                timeline = component "Ledger timeline" "Each ledger event with actor, note and its chain link." "React"
                policyList = component "Policy list" "Active blocking policies, thresholds and owner roles." "React"
                legacy = component "Legacy view" "A static email-and-meeting mock of CHG-1042 being rubber-stamped." "React"
                apiClient = component "API client" "The only path from the browser to state; typed against shared schemas." "TypeScript · fetch"
            }

            api = container "REST API" "Owns all mutable state, policy evaluation, transitions, reset and the ledger." "Node.js 22 · Fastify · TypeScript" {
                changeController = component "Change controller" "Submit, approve, ship, list and detail endpoints for changes." "Fastify route"
                findingController = component "Finding controller" "The resolve endpoint; requires a non-empty note." "Fastify route"
                policyController = component "Policy controller" "Lists active policies." "Fastify route"
                modeController = component "Mode controller" "Reads and sets advisory or enforced mode." "Fastify route"
                resetController = component "Reset controller" "Restores the seed and advisory mode." "Fastify route"
                errorHandler = component "Error handler" "Maps refusals to 400, 403, 404 and 409 envelopes." "Fastify hook"

                /* CALL 1: drawn as a component because the sequence diagram routes through it. */
                roleGuard = component "Demo role guard" "Allow-lists the selected role and refuses actions it may not take." "TypeScript"

                transitionEngine = component "State transition engine" "Owns the state machine; nothing reaches SHIPPED past an open blocking finding in enforced mode." "TypeScript"
                policyEngine = component "Policy evaluation engine" "Compares open findings against each policy's block threshold." "TypeScript"
                modeService = component "Mode service" "Holds the current advisory or enforced mode." "TypeScript"
                ledgerService = component "Hash ledger service" "Appends every success and refusal, each linked to the previous hash." "TypeScript"
                hasher = component "Hash provider" "Computes the SHA-256 link for each ledger event." "node:crypto"
                seedLoader = component "Seed data loader" "Builds CHG-1041 to CHG-1048 and the seeded policy deterministically." "TypeScript"
                resetService = component "Reset service" "Rebuilds the store from the seed and sets advisory mode." "TypeScript"

                /* CALL 3: process-local, so a component. UNTAGGED ON PURPOSE: the theme styles
                   "Data Store" at container depth only, and on a component it put dark component
                   text on the container fill — 3.33:1 against legibility's 4.5 floor. The theme is
                   not ours to change here, so the box gives up its cylinder and keeps its words. */
                store = component "In-memory store" "Changes, findings, policies, gates and ledger events, behind a store interface." "ShipGateStore · process-local maps"
            }
        }

        /* PEOPLE USE THE SCREENS. Enduring wording: what each person does with the app, not a step. */
        developer -> header "Selects the Developer role in"
        developer -> detail "Submits a draft change from"
        approver -> dashboard "Scans the queue by verdict in"
        approver -> detail "Approves and ships changes from"
        securityOwner -> detail "Resolves findings with a note from"
        judge -> legacy "Reads the legacy process in"
        judge -> timeline "Inspects the evidence chain in"

        /* INSIDE THE SPA. */
        detail -> timeline "Renders the ledger through"
        header -> apiClient "Reads and sets mode through"
        dashboard -> apiClient "Fetches grouped changes through"
        detail -> apiClient "Sends governance commands through"
        policyList -> apiClient "Fetches policies through"

        /* THE REST BOUNDARY. Every edge that crosses it carries JSON over HTTPS. */
        apiClient -> changeController "Calls change commands and reads on" "REST JSON · HTTPS"
        apiClient -> findingController "Calls the resolve command on" "REST JSON · HTTPS"
        apiClient -> policyController "Reads policies from" "REST JSON · HTTPS"
        apiClient -> modeController "Reads and sets mode on" "REST JSON · HTTPS"
        apiClient -> resetController "Calls reset on" "REST JSON · HTTPS"

        /* CONTROLLERS DELEGATE; THEY DECIDE NOTHING. */
        changeController -> roleGuard "Checks the demo role with"
        findingController -> roleGuard "Checks the demo role with"
        changeController -> transitionEngine "Requests transitions from"
        findingController -> transitionEngine "Requests finding resolution from"
        policyController -> policyEngine "Reads policy verdicts from"
        modeController -> modeService "Reads and sets mode through"
        resetController -> resetService "Triggers reset through"
        changeController -> errorHandler "Returns refusals through"
        findingController -> errorHandler "Returns refusals through"

        /* CALL 2: a role refusal is evidence too, and it never reaches the engine. */
        changeController -> ledgerService "Appends refused-role events to"

        /* THE DOMAIN. */
        transitionEngine -> modeService "Reads advisory or enforced from"
        transitionEngine -> policyEngine "Asks for the gate verdict from"
        transitionEngine -> ledgerService "Appends every transition and refusal to"
        transitionEngine -> store "Updates change and finding state in"
        policyEngine -> store "Reads open findings and active policies from"
        modeService -> store "Keeps the mode value in"
        ledgerService -> hasher "Links each event to the previous hash with" "SHA-256"
        ledgerService -> store "Appends hash-chained events to"
        resetService -> seedLoader "Rebuilds the dataset with"
        seedLoader -> store "Writes the deterministic seed into"

        forge -> api "Builds, scans and deploys the container image of" "Docker · ECR · ECS"

        deploymentEnvironment "Demo" {
            deploymentNode "Visitor's browser" "No login: every visitor lands as Approver." "Browser" {
                containerInstance spa
            }
            deploymentNode "AWS" "The concrete default the artifact picks; no provider was specified." "Amazon Web Services" {
                deploymentNode "ECS Fargate" "One task, one container: state lives and dies with it." "ECS" {
                    deploymentNode "ShipGate container" "Serves the built SPA assets and the API from one process." "Docker · Node.js 22" {
                        containerInstance api
                    }
                }
            }
        }
    }

    views {
        systemContext shipgate "Context" "Who uses ShipGate, and the one system that ships it." {
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        container shipgate "Containers" "The browser app owns no state; the API owns all of it." {
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        component spa "Screens" "The screens and the one client every screen talks through." {
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        component api "Engine" "Controllers delegate; the transition engine decides; the ledger records both outcomes." {
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
            approver -> spa "Approves CHG-1042 in advisory mode"
            spa -> changeController "POST /api/v1/changes/CHG-1042/approve"
            changeController -> roleGuard "Confirms the Approver role"
            changeController -> transitionEngine "Requests IN_REVIEW to APPROVED"
            transitionEngine -> modeService "Reads advisory"
            transitionEngine -> policyEngine "Gets a block verdict on the CRITICAL finding"
            transitionEngine -> store "Moves CHG-1042 to APPROVED anyway"
            transitionEngine -> ledgerService "Records an approval with an open CRITICAL finding"
            approver -> spa "Ships CHG-1042"
            spa -> changeController "POST /api/v1/changes/CHG-1042/ship"
            changeController -> transitionEngine "Requests APPROVED to SHIPPED"
            transitionEngine -> store "Moves CHG-1042 to SHIPPED"
            transitionEngine -> ledgerService "Records SHIPPED under advisory mode"
            autoLayout lr 500 400
        }

        /* THE TREATMENT. Enforced mode: the identical approval is refused, and the refusal is evidence. */
        dynamic api "Enforced" "Treatment: the identical approval is refused, cited and recorded." {
            properties {
                "structurizr.tooltips" "true"
            }
            approver -> spa "Approves CHG-1042 in enforced mode"
            spa -> changeController "POST /api/v1/changes/CHG-1042/approve"
            changeController -> roleGuard "Confirms the Approver role"
            changeController -> transitionEngine "Requests IN_REVIEW to APPROVED"
            transitionEngine -> modeService "Reads enforced"
            transitionEngine -> policyEngine "Asks for the gate verdict"
            policyEngine -> store "Finds the open CRITICAL secret-handling finding"
            transitionEngine -> store "Refuses the approval and moves CHG-1042 to BLOCKED"
            transitionEngine -> ledgerService "Records the refused approval, citing Secrets must not ship"
            ledgerService -> hasher "Links it to the previous event"
            changeController -> errorHandler "Returns 409 with the cited policy"
            autoLayout lr 500 400
        }

        /* THE RESOLUTION. Only the owning role clears the finding, and the chain shows each hand. */
        dynamic api "Resolve" "The Security Owner resolves with a note; re-approval ships; the ledger reads BLOCKED, RESOLVED, SHIPPED." {
            properties {
                "structurizr.tooltips" "true"
            }
            securityOwner -> spa "Resolves the finding: credential rotated"
            spa -> findingController "POST /api/v1/findings/{id}/resolve"
            findingController -> roleGuard "Confirms the Security Owner role"
            findingController -> transitionEngine "Requests resolution"
            transitionEngine -> store "Marks the finding resolved and CHG-1042 RESOLVED"
            transitionEngine -> ledgerService "Records RESOLVED with the owner's note"
            approver -> spa "Re-approves and ships CHG-1042"
            spa -> changeController "POST approve, then POST ship"
            changeController -> transitionEngine "Requests APPROVED, then SHIPPED"
            transitionEngine -> policyEngine "Gets an allow verdict"
            transitionEngine -> store "Moves CHG-1042 to SHIPPED"
            transitionEngine -> ledgerService "Records SHIPPED, chained after BLOCKED and RESOLVED"
            autoLayout lr 500 400
        }

        deployment shipgate "Demo" "Deployed" "One container on ECS; the SPA runs in the visitor's browser." {
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
