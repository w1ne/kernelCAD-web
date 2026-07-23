---
name: photo-to-device
description: Use when rebuilding a simple front-on consumer electronic, passive enclosure, controller, instrument face, or hobby case from a photo with a known dimension and no moving mechanism.
---

# photo-to-device

Build portable kernelCAD from photo evidence: one image establishes scale, not
hidden construction.

## Use this route

Use for a simple front-on e-reader, remote, meter, controller, display housing, or passive enclosure with one **known dimension**. Escalate robots and mechanisms to the dedicated assembly workflow; require multi-view contracts for joints, transmissions, hardware, and unknown internals.

## Current active Studio/server boundary

The current active Studio sends a typed photo reference to the hosted server,
validating MIME/size, computing SHA-256 provenance, and removing it after the
run. Do not use legacy chat/HeadlessKernel or a client-side hash.

## Reference asset rule — overrides generic overlay guidance

This rule controls generic `referenceImage()` advice from
`use-the-available-kernel` and `blockout-model`.

- An active Studio/server uploaded photo is managed. Never emit
  `referenceImage()` or its temporary/managed asset path in `.kcad.ts`.
  Instead add a source comment with filename and server SHA-256 (never a path),
  then model only from the validated photo brief.
- A checked-in/local source-owned asset may use
  `referenceImage('./reference.jpg', opts)` as a durable overlay.

Record photo reference provenance in the source comment and validated photo
brief: filename, MIME, server SHA-256, known dimension in millimetres, observed
facts, and inferred assumptions.

## Core flow

1. In `// Real Object Brief`, record **observed facts** (outline, screen,
   seams, controls, ports, ratios, measured span) and **inferred facts**
   (depth, back, wall, internals), marking every inference as an assumption.
2. Parameterize the known dimension and derived front face; fit the housing
   envelope before controls or fillets.
3. Model real assemblies/parts: use a named static assembly for distinct
   housing, screen/lens, controls, bezels, or inserts—not cosmetic overlaps.
   A physically one-piece case may remain one part.
4. Add detail only after front, top, and iso views agree with the brief.

## Photo-only limits

A photo-only build cannot establish depth, PCB/battery layout, material stack,
brand dimensions, tolerances, or hidden fastening. It proves neither a
functional device nor a manufacturable copy or safe mechanism; ask for more
dimensions, views, vendor data, or escalation when needed.

`trace_from_image` is optional only for organic silhouettes such as an
ergonomic grip. Never trace a rectangular enclosure, display, or button grid;
use dimensions, parameters, and ratios. Trace output is evidence, not the
object hypothesis.

## Required gates

Before handoff, run:

```bash
kernelcad evaluate build.kcad.ts
kernelcad interference build.kcad.ts
```

`kernelcad evaluate` must have zero errors and `kernelcad interference` zero
unintended overlaps. With the reference hidden, render front, top, and iso:
every visible feature maps to a real part or intentional one-piece feature.

## External mesh and proto.cat boundary

Meshy or Tripo output is not CAD. Retain it only as a visual_mesh_reference for
composition/proportions, never as parts or a way around kernelCAD gates.

For a proto.cat handoff, send asset identity, provenance, known dimension,
observed/inferred brief, and portable gated source—not a local temporary path,
browser data URL, Meshy/Tripo mesh as CAD, or proof of hidden construction.
