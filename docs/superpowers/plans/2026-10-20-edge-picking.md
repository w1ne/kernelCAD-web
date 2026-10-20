# Edge Picking Implementation Plan

> **Status:** Implemented and locally validated on 2026-10-20. The MP4
> capture remains pending because the headless browser security review denied
> CDP access to the local Studio page and desktop capture was unavailable.

**Goal:** Pick stable BREP edges in Studio, expose a multi-selection through
MCP, and use those references in fillet/chamfer operations.

**Architecture:** `edgeIdentity.ts` fingerprints edge curve type, length, and
nine orientation-independent 3D samples quantized at `1e-6` model units. The
viewer uses `edgeRanges` for click/hover mapping and a seven CSS-pixel line
raycast threshold. Shared selection keeps the primary `selection` field and
adds `selections`; edge picks carry stable IDs plus operation-ready
`@kc[feature/edge/s<hash>]` refs.

## Implementation

- [x] Add stable IDs aligned with mesh edge ranges; preserve IDs across the
  worker and feature-mesh bridge; reject ambiguous geometry matches.
- [x] Add unique stable-ID resolution to fillet/chamfer selectors while
  preserving positional `eN` refs.
- [x] Add edge click/hover, fixed-pixel raycast targeting, teal selection
  overlays, and modifier-key topology multi-selection.
- [x] Round-trip primary and full selections through the local MCP session;
  let `apply_surface_blend` accept arrays of selected edge refs and return the
  blend result from the script.
- [x] Add focused docs, MCP descriptions, skill guidance, and a compact
  `examples/edge-picking.kcad.ts` model.
- [x] Add Vitest coverage for stable identity, mesh mapping, worker metadata,
  selection sync, and MCP fillet/chamfer geometry outcomes.
- [x] Add an edge-click Playwright test that checks the stable ref reaches the
  MCP selection endpoint.

## Verification

- [x] `npm run typecheck` passed.
- [x] ESLint passed for changed TypeScript files.
- [x] Focused Vitest suite passed, including the MCP public contract test.
- [x] The Playwright test was attempted against the worktree Vite server, but
  bundled headless Chromium could not launch in this sandbox. Manual Studio
  checks in the existing Chrome session confirmed edge hover and line-click
  dispatch before browser security blocked the MCP endpoint inspection.
- [ ] Capture and inspect the requested MP4 in an approved interactive
  capture session; the README records the available replay source and current
  limitation. No deployment or hardware acceptance is claimed.
