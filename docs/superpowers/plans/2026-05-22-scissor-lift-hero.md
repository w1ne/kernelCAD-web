# Scissor Lift Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a moving scissor-lift mechanism as the kernelcad.com hero demo.

**Architecture:** Keep the existing marketing pipeline intact: `site/scripts/build-demo.ts` selects a demo MP4 from `docs/demos/<version>/<task>/`, copies it into `site/public/demo.mp4`, and writes `demo.json`. Add a v0.11 scissor-lift demo directory and a kernelCAD source model; generate the hero MP4 with a deterministic renderer that animates the same scissor-link geometry.

**Tech Stack:** kernelCAD `.kcad.ts`, Node/Playwright/ffmpeg, Vitest, static marketing site.

---

### Task 1: Selection Test

**Files:**
- Modify: `scripts/lib/selectHeroDemo.test.ts`

- [ ] Add a test proving `0.11.0` selects an override-approved `v0.11/scissor-lift/demo.mp4`.
- [ ] Run `npm test -- scripts/lib/selectHeroDemo.test.ts` and confirm the test fails before the demo directory exists.

### Task 2: Model And Demo Artifacts

**Files:**
- Create: `examples/gallery/scissor-lift.kcad.ts`
- Create: `docs/demos/v0.11/scissor-lift/meta.json`
- Create: `docs/demos/v0.11/scissor-lift/whats-new.md`
- Create: `docs/demos/v0.11/scissor-lift/prompt.md`
- Create: `scripts/renderScissorLiftHero.mjs`

- [ ] Build a two-stage scissor lift model with base rails, top platform, crossed links, rollers, pins, and visible washers.
- [ ] Add metadata with `heroArtifact: "scissor-lift"` and `overrideApprovedBy` explaining this release-facing mechanism choice.
- [ ] Generate `docs/demos/v0.11/scissor-lift/demo.mp4` and `hero-frame.png`.

### Task 3: Site Build Verification

**Files:**
- No production code changes expected unless tests expose a path issue.

- [ ] Run `npm run site:build`.
- [ ] Verify `site/public/demo.json` references `docs/demos/v0.11/scissor-lift/demo.mp4`.
- [ ] Verify the MP4 is non-black and the poster frame shows the mechanism.
- [ ] Run targeted tests and typecheck.
