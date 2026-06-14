# WinnowAI

**A responsible-AI, multi-agent workspace for pharmacovigilance signal detection.**

WinnowAI is a product-design prototype exploring how specialized AI agents can collaborate to detect
drug-safety signals from post-market adverse-event data — with the transparency, human control, and
audit traceability that regulated pharmacovigilance (PV) work demands.

> ⚠️ **Prototype, not a production system.** This is a front-end design prototype with **mock data** —
> there is no real LLM and no live calls to FAERS, EudraVigilance, or any external database. It exists
> to demonstrate the interaction model and UX of a multi-agent PV workspace.

## The idea: a 4+1 agent architecture
A single LLM can't carry the whole PV pipeline — each step needs different expertise, data access, and
trust boundaries. WinnowAI models **four specialist agents governed by one orchestrator**:

- **Planner** (orchestrator) — decomposes the query and commands the specialists.
- **Data Compiler** — retrieves and aggregates evidence (FAERS, EudraVigilance, VigiBase, PubMed,
  Clinical Trials, Europe PMC, bioRxiv, OpenAlex) via parallel sub-agents.
- **Medical Reviewer** — validates biological plausibility and computes disproportionality
  (PRR / ROR / χ²), with genomics, pathway, and molecular sub-agents.
- **PHI Guard** — de-identifies records (HIPAA Safe-Harbor) and normalizes terminology before
  anything moves downstream.

A deliberately hidden **UI Agent** renders findings and elicits input, kept off the visible roster to
avoid cognitive overload.

## What's in here
- **Editable-sentence configuration** — analyses are configured as a plain-language sentence with
  click-to-edit tokens, not forms or accordions.
- **Visible reasoning** — each agent streams its chain-of-thought and tool calls.
- **Evidence inspector** — AI summaries paired with raw source records for independent verification.
- **Signal confidence breakdown** — Source Completeness · Statistical Strength · Biological
  Plausibility, instead of a single opaque score.
- **Continuous monitoring** — promote an analysis to a scheduled standing monitor.
- **Governed Agent Store** — extend the pipeline with governed sub-agents under role-based,
  change-controlled validation (Sandbox → In Review → Validated).
- **Compliance & signature** — exportable audit trail and a regulatory sign-off flow.

## Tech stack
React 19 · Vite 8 · TypeScript · Tailwind CSS v4 · Framer Motion.

## Run locally
```bash
npm install
npm run dev      # start the dev server (Vite)
npm run build    # production build
npm run preview  # preview the build
```

## Project structure
- `src/WinnowAI.tsx` — the application (single-file product mock).
- `src/WinnowData.ts` — mock data (agents, sources, sample analyses).

## Status
Design prototype / portfolio piece. Built by Raya Surya.
