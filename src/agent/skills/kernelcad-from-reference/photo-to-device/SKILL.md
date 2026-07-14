---
name: photo-to-device
description: Use when rebuilding a simple front-on consumer electronic, passive enclosure, controller, instrument face, or hobby case from a photo with a known dimension and no moving mechanism.
---

# photo-to-device

Build portable, editable kernelCAD from bounded photo evidence. One image fixes
visible front-face evidence and scale, not exact hidden construction.

## Use this route

Use for a simple front-on e-reader, remote, meter face, controller, display
housing, or passive hobby enclosure with one **known dimension**. Do not use it
for robots, mechanisms, joints, transmissions, moving hardware, or unknown
electronics internals: escalate those to the dedicated assembly/mechanism
workflow with multi-view evidence and physical contracts.

## Current active Studio/server boundary

The current active Studio sends a bounded typed photo reference to the hosted
server; it validates MIME/size, computes SHA-256 provenance, and removes the
generation-scoped asset after the run. Use this Studio/server path, not legacy
chat/HeadlessKernel, a client-side hash, or a temporary path in `.kcad.ts`.

Record photo reference provenance in the Real Object Brief: source filename,
MIME, server SHA-256, and the known dimension label/value in millimetres.

## Core flow

1. Write `// Real Object Brief`: **observed facts** cover outline, screen,
   seams, controls, ports, relative positions, and the measured span;
   **inferred facts** cover depth, back shape, wall thickness, and internals.
   Label every inference as an assumption.
2. Parameterize the known dimension and derived front-face measurements; fit
   the housing envelope before controls or fillets.
3. Model real assemblies/parts. Use a named static assembly for distinct
   housing, screen/lens, controls, bezels, or inserts. Parts must be plausible
   physical components, not cosmetic overlapping solids; a one-piece case may
   remain one part.
4. Add detail only once front, top, and isometric views agree with the brief.

## Photo-only limits

A photo-only build cannot establish exact depth, PCB/battery layout, material
stack-up, brand dimensions, tolerances, or hidden fastening. It does not prove
a functional electronic device, a manufacturable copy, or a safe mechanism.
Ask for dimensions, extra views, vendor data, or an escalation when needed.

`trace_from_image` is optional only for organic silhouettes such as an
ergonomic grip. Do not trace a rectangular enclosure, display, or button grid:
use the known dimension, parameters, and visible ratios instead. Trace output
is coordinate evidence, never the object hypothesis.

## Required gates

Before handoff, run:

```bash
kernelcad evaluate build.kcad.ts
kernelcad interference build.kcad.ts
```

`kernelcad evaluate` must have zero errors; `kernelcad interference` zero
unintended overlaps. With the reference hidden, render front, top, and iso;
every visible feature must map to a real part or intentional one-piece feature.

## External mesh and proto.cat boundary

Meshy or Tripo output is not CAD and never authoritative CAD geometry. Retain
it only as a visual_mesh_reference for composition/proportions, never as a
substitute for parts or a way around kernelCAD gates.

For a proto.cat handoff, send the managed reference asset identity, provenance,
known dimension, observed/inferred brief, and portable gated source—not a local
temporary path, raw browser data URL, Meshy/Tripo mesh as CAD, or proof of
hidden construction.
