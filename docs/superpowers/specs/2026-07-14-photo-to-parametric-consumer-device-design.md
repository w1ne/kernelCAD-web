# Photo-to-Parametric Consumer Device Design

## Status

Approved for implementation by the user's explicit overnight request on 2026-07-14. This document records the bounded first milestone rather than waiting for an interactive review.

## Problem

KernelCAD already exposes `referenceImage()` and `trace_from_image`, but an agent receiving a product photograph has no focused, evidence-backed recipe for turning a simple consumer-electronics reference into editable CAD. A raw image-to-mesh result is useful visual evidence but cannot establish hidden geometry, dimensions, manufacturability, or electronics fit.

## Decision

Ship a native photo-to-parametric path for simple, slab-like consumer devices. The acceptance artifact is a public-domain Kindle 2 front photograph reconstructed as an editable e-reader enclosure with a display recess, navigation control, status LED, and USB-C opening. The model will explicitly state its inferred dimensions and hidden-side assumptions.

The path is deliberately provider-neutral:

- A photo plus at least one known dimension is the required input.
- `referenceImage()` stays available as the visual alignment aid.
- `trace_from_image` is optional for organic silhouettes, not required for rectangular devices.
- Any later Meshy, Tripo, Rodin, or photogrammetry output is named `visual_mesh_reference`; it must never be represented as a KernelCAD, STEP, BREP, or manufacturable result.

## Scope

1. Add a `photo-to-device` child skill beneath `kernelcad-from-reference` with the decision rules, provenance requirements, and deterministic gates for consumer electronics.
2. Add a checked-in, public-domain e-reader reference photograph and provenance file.
3. Add one parameterized e-reader `.kcad.ts` artifact with a complete Real Object Brief and conservative physical assumptions.
4. Add an integration test that proves the example, its reference asset, and its key editable parameters remain valid.
5. Produce an explicit render-inspection packet during verification.

## Non-goals

- No claim that one image recovers a real product's PCB, battery, fasteners, material stack, or exact dimensions.
- No public proto.cat upload surface or direct handoff to its current mesh endpoint.
- No external image-to-mesh provider integration, keys, billing, or network dependency.
- No attempt to use the visual acceptance model as a branded production clone; it is an internal reference-reconstruction benchmark.

## Architecture

```text
reference photo + known width
        |
        v
Real Object Brief and provenance
        |
        v
parametric KernelCAD source (.kcad.ts)
        |
        +--> evaluate / interference / DFM
        |
        +--> render inspect packet and visual review
```

The skill owns agent behavior. The example owns the concrete first-use-case source and proves the API surface. The integration test protects both from drift without making a network request.

## Acceptance criteria

- The e-reader source has named, bounded dimensions for body, display, bezel, control, and USB-C opening.
- It contains a Real Object Brief with known facts, inferred facts, and validation focus.
- The local reference photo is validated by `referenceImage()` during evaluation.
- `kernelcad evaluate` has no errors, the four-part static assembly reports no interference pairs, and the rendered model visibly reads as a real, layered e-reader rather than a flat card.
- The reusable skill instructs agents to ask for a known dimension, model visible geometry first, label inferred internals, and route mechanisms to the assembly/physical-review workflow.

## Follow-on integration boundary

proto.cat should eventually accept an authenticated, stored reference identifier rather than arbitrary image URLs, derive a device brief, and invoke the same parametric KernelCAD path. Its current visual mesh route is not the handoff contract: it needs a separate security and provenance hardening pass before it can be used for this feature.
