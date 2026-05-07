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
- model-specific toolsets generated from that intent;
- agent-readable feature history, names, diagnostics, and validation;
- generated part families and variants, not one opaque shape;
- review and steering UI, not a traditional CAD toolbar clone;
- design rationale and assumptions captured with the artifact;
- export packages that include `.kcad.ts`, STEP/STL/DXF when available,
  preview images, validation results, and assumptions.

Every new feature should answer: does this help an agent produce, prove, revise,
or package a real mechanical artifact?

## Generated Design Environments

The product artifact is not only a mesh, STEP file, or `.kcad.ts` source file.
For meaningful designs, kernelCAD should generate a small design environment
around the model:

- a model-specific parameter schema;
- a review UI adapted to the object being built;
- validation checks and failure explanations;
- allowed human and agent operations;
- variant controls and comparison metrics;
- export targets and packaging rules;
- documentation: assumptions, hardware choices, limitations, and rationale.

For a robot arm, the generated interface should expose link lengths, servo or
bearing choices, joint limits, reach envelope, collision checks, and part
exports. For a copter frame, it should expose wheelbase, motor pattern, stack
pattern, plate thickness, battery strap width, symmetry checks, and stiffness or
clearance assumptions. The UI should adapt to the model's intent rather than
present the same generic CAD toolbar for every object.

## Long-Term Differentiators

### Model-Specific Toolset

Each generated design should carry its own tool contract: parameters, checks,
variant controls, export targets, and agent operations. This makes the browser
feel like a purpose-built cockpit for the current artifact instead of a generic
editor.

### Validation-As-Product

Validation should be a first-class output. A useful design package should say
what passed, what failed, what assumptions were made, and which revisions are
available. Validation should cover geometry compilation first, then hardware fit,
clearances, motion limits, minimum thickness, export success, and manufacturing
constraints where available.

### Design Rationale

The system should preserve why the design changed: "arm widened because joint
clearance failed", "M3 screw pattern selected for this servo class", or "fillet
skipped because the kernel rejected that edge set". This rationale should be
visible to humans and queryable by agents.

### Variant Studio

kernelCAD should produce and compare families, not single outputs. Variants can
optimize for lighter, stronger, cheaper, easier to print, more compact, or more
standard hardware. The comparison should include geometry, parameters,
validation results, estimated material, and export status.

### Function-First Generative Design

Longer term, the user should be able to specify functional requirements:
mounting interfaces, loads, keep-out volumes, stiffness regions, symmetry,
manufacturing process, and hardware standards. The agent then generates
candidate geometry and explains the tradeoffs. This does not require full
simulation in the next cut; the first version can use explicit rules and
lightweight checks. More advanced field-driven or optimized forms can follow
once the validation and variant loop is real.

### Human-Agent Co-Design

The human should steer intent: "make it 30% lighter", "keep the same servo",
"show the stronger variant", "explain the clearance failure", or "export only
printable parts". The agent edits `.kcad.ts`, reruns checks, and updates the
generated design environment.

## Iteration Ladder

### v0.5: Generated Tool Contract

The first step is proving that a generated model can carry a useful interface
contract. For the robot arm kit, the contract should define intent parameters,
validation checks, export targets, assumptions, and supported revision actions.
The UI can be simple, but it must be model-specific.

### v0.6: Variant Studio

Once one design environment works, generate and compare multiple variants of the
same intent. The comparison should show parameters, visible geometry
differences, validation status, estimated material, and export readiness. The
agent should be able to create targeted variants such as lighter, stronger,
longer reach, or easier to print.

### v0.7: Rationale And Revision Loop

The next step is making the design history useful to humans and agents. The
artifact should record why changes happened, what failed, what was preserved,
and what tradeoff each revision made. Validation failures should offer concrete
revision actions instead of only reporting errors.

### v0.8+: Function-First Generative Forms

After validation, variants, and rationale are real, kernelCAD can pursue more
ambitious generated forms: load-path-inspired ribs, keep-out-aware brackets,
lattice-like weight relief, field-driven density zones, and other complex
geometry driven by function rather than decoration. These should be introduced
through bounded workflows with explicit assumptions before attempting general
simulation or topology optimization.

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
- generate a model-specific review panel for robot-arm parameters, checks, and
  exports;
- run validation checks for reach, hole alignment, joint spacing, and clearance;
- show validation results beside the model;
- capture design assumptions and rationale in the artifact manifest;
- export individual part files and a manifest;
- include one release demo showing intent to generated model to validation.

Deferred from v0.5:

- multi-variant optimization;
- full inverse kinematics;
- electrical routing;
- dynamic simulation;
- field-driven geometry or topology optimization;
- production drawings;
- arbitrary assembly authoring UI;
- generic manual sketch/feature editing as the main workflow.

## Gates

A slice is not product-complete unless it ships:

- an intent-level entry point;
- generated `.kcad.ts`;
- a generated or model-specific tool contract;
- rendered geometry;
- meaningful validation results;
- at least one revision path when validation fails;
- documented assumptions and rationale;
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
