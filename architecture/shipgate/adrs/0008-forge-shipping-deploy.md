# 8. Deployment: Forge Shipping to AWS ECS

Date: 2026-09-23

## Status

Superseded

## Context

The policies require supply-chain scanning, artifact integrity and gated promotion. No cloud provider was specified.

## Decision

Forge Shipping runs the Node build, builds a Docker image, runs the SonarQube, Snyk, gitleaks, Semgrep and Grype scans, signs the image, pushes it to ECR, and deploys to ECS through dev, staging and a manual gate.

## Consequences

Rejected: manual deploys (not repeatable) and full GitOps (too much to operate). Adds CI configuration work even for a demo.

Source: the decision table in Forge's ShipGate architecture artifact, 2026-09-23.

Superseded by decision 9: the app deploys as one process on Render, because in-memory state needs a single long-running instance.
