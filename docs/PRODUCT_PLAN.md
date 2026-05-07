# kernelCAD Product Plan

## North Star

kernelCAD is an AI-native CAD workbench that turns mechanical intent into
validated, editable, manufacturable design artifacts.

The core loop is:

1. Capture mechanical intent.
2. Generate deterministic `.kcad.ts`.
3. Render and explain the model.
4. Validate constraints, hardware fit, clearances, and exportability.
5. Revise through agent-readable feedback.
6. Export source, preview assets, and manufacturing files.

## Differentiation

kernelCAD is not a browser clone of Fusion, Onshape, or SolidWorks. It is also
not a Replicad wrapper with a friendlier editor. Replicad/OpenCASCADE are the
kernel layer. kernelCAD must own the workflow above the kernel:

- intent-level design tasks instead of primitive-first modeling;
- agent-readable feature history, names, diagnostics, and validation;
- generated part families and variants, not one opaque shape;
- review and steering UI, not a traditional CAD toolbar clone;
- export packages that include `.kcad.ts`, STEP/STL/DXF when available,
  preview images, validation results, and assumptions.

Every new feature should answer: does this help an agent produce, prove, revise,
or package a real mechanical artifact?

## Product Boundaries

### Browser App

The browser is the review cockpit. It should help a human inspect generated
designs, edit parameters, compare variants, read validation failures, and export
artifacts. It should not become the main place where users manually draw CAD
from primitives.

### CLI And MCP

The CLI and MCP server are the automation surface. They should let agents
generate `.kcad.ts`, evaluate geometry, inspect topology, run validation, and
produce export packages without depending on browser state.

### Core Kernel Layer

The core remains platform-neutral: `.kcad.ts` evaluation, feature records,
geometry lowering, diagnostics, meshing, and exports. Kernel operations are
important only when they support higher-level mechanical workflows.

## Next Differentiating Cut: Desktop Robot Arm Kit

The next major slice should be a bounded but non-trivial vertical workflow:
a parametric 3-axis desktop robot arm kit.

This is deliberately more demanding than another flat plate. It forces the
capabilities that distinguish kernelCAD from primitive scripting:

- multiple generated parts from one design intent;
- named assembly instances and transforms;
- revolute joint definitions and motion ranges;
- servo or bearing hardware patterns;
- screw-hole and shaft alignment validation;
- collision or clearance checks across the motion envelope;
- separate exports plus a manifest describing each part.

The target is not an industrial robot. The target is a believable printable or
laser-cut desktop kit with three links, three pivots, a simple end-effector
placeholder, and visible validation.

## v0.5 Scope

v0.5 should prove the vertical workflow end to end:

- define a robot-arm intent schema with link lengths, plate thickness, servo
  class, screw pattern, and joint limits;
- generate a part set as `.kcad.ts` from that intent;
- render the assembled arm in the browser review cockpit;
- expose parameter editing for the intent, not raw primitive editing;
- run validation checks for reach, hole alignment, joint spacing, and clearance;
- show validation results beside the model;
- export individual part files and a manifest;
- include one release demo showing intent to generated model to validation.

Deferred from v0.5:

- full inverse kinematics;
- electrical routing;
- dynamic simulation;
- production drawings;
- arbitrary assembly authoring UI;
- generic manual sketch/feature editing as the main workflow.

## Gates

A slice is not product-complete unless it ships:

- an intent-level entry point;
- generated `.kcad.ts`;
- rendered geometry;
- meaningful validation results;
- at least one revision path when validation fails;
- exportable artifacts;
- tests that cover the workflow promise, not only helper functions;
- a release demo that a new user can understand without reading internals.

## Anti-Goals

- Do not compete with mature manual CAD tools on generic modeling UX.
- Do not add primitives solely because traditional CAD has them.
- Do not ship demos that are just boxes, plates, cylinders, or decorative
  trinkets unless they prove a workflow capability.
- Do not hide failures behind polished renders; validation failures are part of
  the product loop.
