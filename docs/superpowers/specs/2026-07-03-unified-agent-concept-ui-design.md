# Unified agent + 3D concept UI — design

**Date:** 2026-07-03
**Status:** approved-by-default (user asked "research and implement the easiest UI, nicely
merged"; option question timed out, proceeding with the recommended option — user can veto)

## Problem

The agent rail stacks two separate mini-forms: AGENT (textarea + "Edit with agent →") and
3D CONCEPT PREVIEW (its own header + textarea + "Generate concept (preview)"). Two text
boxes for what is, to the user, one intent ("here's what I want — show me / build it").
The concept result also renders below the fold with no scroll cue, and its "Rebuild as
parametric CAD" button is a disabled stub.

## Chosen approach: one box, two actions

One prompt textarea drives both features. Buttons side by side:

```
┌─ AGENT ─────────────────────────┐
│ ┌─────────────────────────────┐ │
│ │ a compact ESP32 enclosure…  │ │
│ └─────────────────────────────┘ │
│ [    Build →    ] [ 3D concept ]│
│  …agent steps / diff review…    │
│ ┌─────────────────────────────┐ │
│ │        🧊 3D viewer         │ │
│ └─────────────────────────────┘ │
│ [   Build as parametric CAD → ] │
└─────────────────────────────────┘
```

Rejected: mode toggle (hides the concept behind a switch — less discoverable);
concept-first wizard (forces the paid preview into every free user's path, doubles
latency for users who just want the model).

## Behavior

- **One textarea** (existing agent one, same adaptive placeholder). Disabled while either
  operation runs; one operation at a time (both buttons disabled while either is busy).
- **Build →** — unchanged agent submit (label "Edit with agent →" when the editor has code).
- **3D concept** — secondary button, calls `useTextTo3dPreview().submit(prompt)`. While
  running it shows `Concept… N%`. Hidden entirely when the preview phase is `unavailable`
  (server has no provider key), replaced by nothing — the rail simply has one button.
- **Concept result** — viewer renders below the agent output area. On `done`, the viewer
  scrolls itself into view (`scrollIntoView`, smooth, guarded for test envs). Below it,
  **Build as parametric CAD →** is now a REAL action: it feeds the concept's prompt into
  the same agent submit (edit mode when code exists), completing the
  concept → approve → parametric pipeline with what ships today. Disabled while busy.
- **Upgrade (402/401)** and **error** alerts render where the result would, as today.

## Components

- `StudioGenerate.tsx` — owns the single `prompt` state and both hooks
  (`useGeneration`, `useTextTo3dPreview`); renders the button row and `<ConceptResult/>`.
  Remembers `conceptPrompt` (the prompt used for the last concept) so Build-as-CAD uses
  what the user actually previewed even if they've since edited the box.
- `ConceptResult.tsx` (new; replaces `PreviewConceptPanel.tsx`) — presentational:
  `{ phase, onBuildAsCad, buildDisabled }`. Renders upgrade/error alerts, the
  `<model-viewer>` on done + the Build-as-CAD button, a quiet note on `unavailable`.
  No textarea, no hook ownership. `useModelViewer` lazy-CDN loading stays here.
- `PreviewConceptPanel.tsx` + its test are deleted (superseded).

## Testing

Adapt `PreviewConceptPanel.test.tsx` patterns (happy-dom + testing-library):
- `ConceptResult.test.tsx`: done → viewer with glb src + Build-as-CAD **enabled**, fires
  `onBuildAsCad`; disabled when `buildDisabled`; upgrade alert; unavailable note; renders
  nothing on idle.
- `StudioGenerate.test.tsx` (new): exactly one textarea; concept button calls preview
  submit with the typed prompt; concept button hidden on `unavailable`; Build-as-CAD
  triggers the agent submit with the concept prompt. Mocks: `agentAvailability`
  (localhost guard would blank the component), `useGeneration`, `useTextTo3dPreview`,
  Code/Geometry contexts, `@monaco-editor/react`.

No server changes. No new deps.
