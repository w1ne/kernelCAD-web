# Mesh-Conditioned Robot Hand Prototype Design

## Purpose

Build a narrow prototype that keeps the original robot hand reference in the
modeling loop without treating it as a complete physical design. The reference
drives visible fit. A hand-specific mechanical completion template adds the
hidden structure needed for joints, load paths, clearances, and validation.

## Problem

The current robot hand workflow fails in two ways:

- Manual primitive edits drift away from the original reference render.
- Reference-derived shape alone is physically incomplete and cannot prove a
  working mechanism.

The prototype must avoid both failures. It should not become a generic mesh
importer yet.

## Scope

In scope:

- Add a structured `referenceLandmarks` block to the five-finger robot hand
  example.
- Generate visible hand proportions from those landmarks: palm, wrist, finger
  roots, finger lengths, thumb angle, actuator windows, tendon rods, and screws.
- Generate missing physical structure from a hand mechanism template: clevises,
  pins, connector axes, revolute mates, load limits, clearances, and external
  load checks.
- Add integration tests that make the reference-conditioned workflow explicit
  and reject render-budget loose-body patterns.

Out of scope:

- Real GLB/STL mesh import.
- Automatic mesh segmentation.
- Generic `fit.box()` / `fit.hinge()` APIs.
- Full visual similarity scoring.

## Architecture

The example script owns two layers:

1. `referenceLandmarks`: an evidence layer with visible dimensions and feature
   positions from the original robot hand render.
2. Mechanical completion functions: deterministic generators that convert
   landmarks into an articulated, validated KernelCAD assembly.

The assembly remains the source of truth. The reference layer is kept beside
the parameters so future agents cannot silently replace it with guessed
coordinates.

## Data Model

`referenceLandmarks` contains:

- `palm`: width, depth, height, center, and shoulder geometry.
- `wrist`: block dimensions, position, and tendon anchor row.
- `actuatorWindows`: visible black inserts on the palm face.
- `screws`: visible screw-head positions.
- `tendons`: visible rod paths.
- `fingers`: one entry per finger with root x/z, phalanx lengths, width, visual
  angle, curl limits, and load limits.

This is intentionally plain JavaScript data inside the `.kcad.ts` example so it
is easy to inspect and mutate without adding public API surface.

## Mechanical Completion

The generator must add what the reference cannot prove:

- clevis fork/tongue geometry at MCP, PIP, and DIP joints;
- pin caps and hole clearances;
- connector frames on both sides of each joint;
- revolute mates with limits;
- load limits and external loads;
- unioned non-articulated visible details on the palm root so they are not
  separate floating bodies.

## Acceptance Criteria

- The example evaluates at open pose and closed pose with no error diagnostics.
- The script has a top-level `referenceLandmarks` object.
- All five fingers are generated from `referenceLandmarks.fingers`.
- The thumb angle and root position come from the reference landmark data.
- No render-budget loose-body patterns remain: no `parts.push`, no `return parts`,
  no `addPart(`.
- The assembly exposes exactly one palm root plus three parts per finger.
- The assembly exposes fifteen revolute mates.
- Visible palm details are unioned into the palm root or articulated parts, not
  left as separate loose solids.

## Non-Goals And Risks

This prototype does not prove that arbitrary meshes can become parametric CAD.
It proves a smaller workflow: reference evidence can stay in the source while a
mechanical template completes missing physical structure.

The main risk is pretending the landmark object is automatic mesh fitting. It is
not. It is a hand-authored evidence layer that should later be produced by
mesh/image landmark extraction.
