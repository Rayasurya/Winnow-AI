# PRD-001: WinnowAI Regulated-Product Hardening

> Status: ready-for-agent · Author: Raya Surya · Date: 2026-07-02
> To be filed to the Winnow-AI GitHub issue tracker (label `ready-for-agent`) when API access is available.
> Source decisions: grilled plan of 2026-07-02 (34 locked decisions). Editing happens ONLY in the portfolio repo's `winnow-v8/`; the Winnow-AI repo is a republish target.

## Problem Statement

WinnowAI convincingly demonstrates agentic pharmacovigilance analysis (multi-agent orchestration, PHI redaction, signal statistics), but a reviewer who knows the domain — or any hiring panel probing beyond the surface — finds three gaps: (1) there is no governance layer, so AI decisions are unaccountable (no immutable audit record, no role separation, no human adjudication of uncertain outputs); (2) the product is a standalone silo that cannot exchange cases with the safety systems every real organization runs (Argus, LifeSphere — all speaking E2B(R3)); (3) a first-time visitor has no fast path to the product's best moments and can wedge the demo in unfinished states. Additionally, any new work risks breaking the existing, working product — which is itself a portfolio asset that must keep functioning.

## Solution

Harden WinnowAI into "a concept product designed to production/regulatory standards" by adding a complete governance loop (append-only hash-chained audit ledger with tamper demonstration, Scientist/QPPV role separation with QPPV attestation, a human adjudication inbox with confidence scores and mandatory override justifications), a real interoperability demo (E2B(R3) XML import and export with duplicate detection), deeper signal-detection craft (MedDRA hierarchy drill-down on a hand-built subset, auto-coding override moment, corrected-statistics labeling), and a guided first-run experience (in-product tour + chaptered demo-video timeline). All new logic ships as extracted, unit-tested pure modules; all changes are additive and gated behind a review-before-merge workflow so the existing product never regresses.

## User Stories

1. As a hiring panel reviewer, I want a guided tour of the product's key surfaces, so that I understand its strongest ideas in under three minutes.
2. As a case-study visitor, I want the demo video to show a chaptered timeline with highlighted moments, so that I can jump straight to the most interesting interactions.
3. As a demo visitor, I want highlight markers to visually distinguish key moments (accent color) from ordinary chapters, so that I know where to click first.
4. As a safety scientist, I want every agent decision recorded in an append-only audit ledger, so that any output can be traced to the agent, time, and evidence that produced it.
5. As a safety scientist, I want each ledger entry cryptographically chained to the previous one, so that tampering with history is detectable.
6. As a compliance reviewer, I want a "verify integrity" action on the ledger, so that I can confirm the record is intact on demand.
7. As a demo visitor, I want a reversible "simulate tampering" demonstration, so that I can see the chain break and understand why immutability matters.
8. As a QPPV, I want an attestation flow that states exactly what I am signing and requires re-authentication, so that my signature is meaningful and non-repudiable.
9. As a compliance reviewer, I want signatures recorded as ledger entries, so that attestations are part of the same immutable record.
10. As a user, I want to switch between Scientist and QPPV roles from a "View as…" control in the profile menu, so that I can experience the product from either responsibility.
11. As a scientist, I want triage and analysis actions available to me but attestation locked, so that role separation is real rather than cosmetic.
12. As a QPPV, I want attestation and signing available to me, so that final accountability actions belong to the accountable role.
13. As an auditor of the record, I want each ledger entry to state the acting role, so that responsibility is attributable.
14. As a safety scientist, I want low-confidence agent decisions routed to an adjudication inbox, so that uncertain automation is reviewed by a human before it counts.
15. As a safety scientist, I want each queued item to show the decision, a confidence percentage, and an evidence chain, so that I can judge it with full context.
16. As a safety scientist, I want to accept an agent decision in one action, so that reviewing high-quality output is fast.
17. As a safety scientist, I want overriding an agent decision to require a written reason, so that disagreement with automation is deliberate and documented.
18. As a compliance reviewer, I want overrides (with reasons) written to the audit ledger, so that the human-machine decision trail is complete.
19. As a user, I want a queue count visible in navigation, so that pending adjudications are impossible to miss.
20. As a safety scientist, I want to drill a signal from MedDRA Preferred Term up through HLT/HLGT to SOC, so that I can reason about signals at the right level of the hierarchy.
21. As a safety scientist, I want case intake to show an "auto-coded" MedDRA chip with confidence and an override affordance, so that automated coding stays under human control.
22. As a statistician, I want signal metrics labeled with their continuity-correction method for low-n data, so that the statistical treatment is transparent.
23. As a safety operations user, I want to import a case from an E2B(R3) XML file, so that WinnowAI participates in the standard safety-data exchange rather than living in a silo.
24. As a safety operations user, I want an imported case to carry a provenance badge, so that its origin is visible through the workflow.
25. As a safety operations user, I want to export any case as E2B(R3) XML, so that work done in WinnowAI can flow onward to Argus-class systems.
26. As a safety operations user, I want possible duplicates flagged at import with a match score and a review/merge choice, so that the intake pipeline behaves like a real one.
27. As a demo visitor, I want new surfaces to have proper empty, loading, and error states, so that exploring in any order never looks broken.
28. As a demo visitor, I want a "reset demo" affordance, so that I can return the product to a clean state after experimenting.
29. As a mobile visitor, I want a graceful notice on unsupported viewports, so that the product degrades intentionally.
30. As the product owner, I want all new logic delivered as extracted pure modules with unit tests, so that the codebase demonstrates engineering hygiene and survives review on GitHub.
31. As the product owner, I want every slice developed on a feature branch and reviewed on a preview build before merge, so that the existing working product is never broken by new work.
32. As the product owner, I want CI on the Winnow-AI repo running lint/build/tests on every push, so that regressions are caught mechanically, not just by eyeball.
33. As the product owner, I want each slice shippable independently, so that a half-finished initiative still leaves the product coherent.

## Implementation Decisions

- **Architecture rule:** all new business logic is extracted into standalone pure modules rather than added to the existing monolithic component. New modules: an audit service (hash-chained append-only log), an E2B(R3) codec (parse + serialize), a MedDRA subset dataset with traversal helpers, an adjudication queue reducer, and a role-permission map. UI components consume these modules.
- **Audit ledger:** each entry stores agent/actor, action, timestamp, payload hash, and previous-entry hash (SHA-256). Chain verification recomputes hashes; a demo-only "simulate tampering" mutates a historical entry in memory and the UI shows the broken chain; the mutation is reversible. Ledger is session-scoped (in-memory/localStorage) — no server.
- **Attestation:** signing modal displays the statement of meaning (21 CFR Part 11-styled), requires mock re-authentication, and emits a ledger entry of type "signature". Builds on the existing signature-history surface.
- **Roles:** exactly two roles — Scientist and QPPV. A pure `can(role, action)` permission map drives which actions render enabled. Switcher lives in the profile menu as "View as…". Acting role is recorded on every ledger entry.
- **Adjudication:** decisions below a confidence threshold enqueue. Queue state transitions (enqueue, accept, override) are a pure reducer. Override requires a non-empty reason and emits a ledger entry. Confidence renders as a percentage chip with color band; the evidence popover reuses the existing agent thought-step data.
- **Signal detection:** MedDRA hierarchy is a hand-built subset (~30 terms across 3–4 SOCs) — real MedDRA is licensed and out of scope. Drill-down is PT→HLT→HLGT→SOC. Statistics displays gain a "Yates-corrected PRR/ROR (low-n)" label only; the mock calculation engine is unchanged.
- **E2B(R3):** import accepts bundled sample XML files, parsed client-side into the case shape; imported cases show a provenance badge and may trigger a duplicate-detection prompt (match score, review/merge). Export serializes a case back to E2B(R3) XML for download. Schema follows the ICH E2B(R3) core fields (safety report id, patient, reactions with MedDRA terms, drugs).
- **Guided tour:** 4–5 scripted, skippable, resumable beats over the flagship surfaces. Entry visible on load.
- **Video timeline (portfolio side):** the existing 5-minute demo video player gains a chaptered timeline bar with clickable annotated markers; highlight moments use the case-study accent color (green), others grey/brown. Highlighted moments: prompt-building with inline UI components, and agent statuses/responses in chat. (This slice lives in the portfolio case-study code, not winnow-v8.)
- **Safety workflow (standard SWE):** one feature branch per slice off main in the portfolio repo; all quality gates green per slice; user reviews the slice on a preview build BEFORE merge; merge is fast-forward-only; after merge, push portfolio then republish to Winnow-AI via the sync script. Add a CI workflow to the Winnow-AI repo (its `.github/` is preserved by the sync) running lint, build, and unit tests on every push. Existing product behavior must be unchanged unless the slice explicitly touches it; new features are additive.
- **Positioning constraints (case-study side):** concept product framing, qualitative audit narrative (no numeric scorecard), metrics labeled as simulated, sole author (built directing coding agents), no model/vendor attribution anywhere in commits or content.

## Testing Decisions

- Good tests assert external behavior of the pure modules — inputs and outputs — never internal representation. No UI snapshot tests.
- Tooling: add Vitest to winnow-v8 (first test infrastructure in this package) with a `test` script wired into the slice quality gates and Winnow-AI CI.
- Modules under test and their key behaviors:
  - Audit service: appending N entries yields a verifiable chain; mutating any historical entry makes verification fail; signature entries carry role + meaning.
  - E2B codec: sample XML parses to the expected case object; parse→serialize→parse round-trips equal; malformed XML returns a graceful error, never throws unhandled.
  - Adjudication reducer: enqueue/accept/override transitions; override with empty reason is rejected; accepted/overridden items leave the queue; override emits a ledger entry.
  - Role permission map: Scientist cannot attest/sign; QPPV can; unknown action defaults to denied.
  - MedDRA traversal: every PT in the subset resolves a full lineage to SOC; unknown term yields a safe miss.
- UI layer: covered by the portfolio's existing Playwright smoke suite — extend it with a route/render check per new surface (ledger, adjudication inbox, tour entry) — plus the user's manual review-on-preview gate per slice.
- Prior art: the portfolio repo's Playwright smoke tests (route-level checks) are the pattern for the UI checks; there is no prior unit-test art in winnow-v8 — the Vitest setup added here becomes the precedent.

## Out of Scope

- Real backend / server-side agent execution (frontend prototype by design; production path shown as an architecture diagram in the case study).
- FHIR/RWE ingestion, OpenTelemetry observability, sidecar REST gateway, real Argus/LifeSphere connectivity.
- A third (Auditor) role; document/email-extraction intake (E2B chosen as the single integration demo).
- Real MedDRA licensing or full dictionary; real authentication; real user accounts.
- Full-product QA sweep (hardening is a targeted pass on new surfaces only).
- Publishing a numeric readiness scorecard; production-readiness claims of any kind.
- The outreach/networking track and the portfolio case-study prose itself (separate work items; only the video-timeline component is in a slice here).

## Further Notes

- Slice order (each independently shippable): 1 tour + video timeline → 2 audit ledger + attestation → 3 roles → 4 adjudication + confidence → 5 signal upgrade → 6 E2B import/export + duplicates → 7 targeted hardening. Slices 2–4 form one governance narrative and should ship in that order; 5–6 are independent of each other.
- The Winnow-AI repo's `.github/` is preserved by the republish script, so its CI workflow is edited directly in that repo (the one exception to "edit only in winnow-v8/").
- The demo must remain fully client-side and hostable as static files (portfolio embeds it at /winnow; InfinityFree 1MB-per-file limit applies to any new assets, samples included).
