# Function-First Robot Hand Design

## Purpose

Build robot hands from grasp requirements instead of visual appearance. A model
is accepted only when it can satisfy explicit object-holding tasks with a
physically connected mechanism. Visual references and mesh fitting are secondary
inputs used after functional gates pass.

## Problem

The previous hand attempts started from a front-facing hand image or from visual
workflow variants. That produced repeated failures:

- parts looked disconnected or unsupported;
- fingers were placed to satisfy a silhouette instead of contact geometry;
- visual rods and panels did not prove load paths;
- mesh/reference fitting could not recover hidden joints, bearings, pins, or
  actuation anchors.

The correct starting point is: what must the hand hold, where must it contact,
and what loads must travel through the mechanism?

## Core Rule

Function before form.

For a robot hand, tests are the design brief. The CAD model is generated from
grasp tasks, contact targets, joint limits, and load paths. A hand that looks
good but cannot satisfy the grasp tests is rejected.

## Required Grasp Tasks

The initial task set lives in `scripts/robotHandFunctionalRequirements.ts`.

1. **Pinch thin plate**
   Hold a 2-5 mm plate or card edge between thumb and fingertip.

2. **Power grasp cylinder**
   Wrap around a 30-55 mm cylinder such as a bottle neck, tool handle, or pipe.

3. **Spherical grasp**
   Enclose a 35-65 mm sphere with at least three useful contact regions.

4. **Box grasp**
   Hold a rectangular block using opposed faces, not fingertip-only cheating.

5. **Hook or handle pull**
   Curl around a handle or ring section and carry pull load through the palm.

6. **Wide object aperture**
   Open far enough to accept an object wider than the relaxed palm contact span.

## Acceptance Gates

Each candidate hand must prove:

- target contact points are reachable;
- contact normals oppose object escape;
- joint limits are respected;
- pose envelope has no breaking self-collisions;
- object clearance exists in open and closed poses;
- loaded parts are in the mate graph;
- joint axes pass through supported material;
- actuation/transmission has anchored load paths;
- visual reference styling is applied only after functional gates pass.

## Build Sequence

```text
grasp tasks
  -> object envelopes and contact targets
  -> joint skeleton and thumb placement
  -> finger count and phalanx lengths
  -> palm and bearing support geometry
  -> actuator/transmission anchors
  -> pose/load/interference validation
  -> visual styling and reference fit
```

## First Artifact

The first real artifact should be a three-finger functional hand, not a
five-finger visual hand.

Minimum structure:

- one opposed thumb;
- two fingers that can cooperate or oppose the thumb;
- palm with physically supported hinge blocks;
- named parts and mates for every loaded body;
- fingertip/contact connectors;
- declared grasp targets for plate, cylinder, sphere, box, handle, and wide
  object aperture.

Why three fingers first:

- covers the grasp test set with fewer joints;
- exposes disconnected parts faster;
- makes reachability and load-path failures easier to debug;
- avoids wasting effort on decorative non-contact fingers.

## Relation To Meshes And References

Meshes and images remain useful, but only after function is defined:

- reference images provide styling and rough proportions;
- meshes can suggest object envelopes or visible surfaces;
- neither source is allowed to satisfy a mechanical gate by itself.

If mesh fitting cannot produce joint centers, supported axes, contact targets,
and load paths, it is evidence only, not a design.

## Tooling Implications

KernelCAD should support a function-first hand workflow:

- declare grasp tasks and target objects;
- generate contact targets and workspace requirements;
- synthesize a skeleton from those targets;
- generate physical joints and transmission anchors;
- run pose-envelope, aperture, collision, and load-path reviews;
- only then apply visual/reference fitting.

The current two-finger aperture review and workspace tools are the nearest
existing primitives. The next implementation should extend them from gripper
aperture into multi-contact grasp tests.

## Success Criteria

- `scripts/robotHandFunctionalRequirements.ts` defines the required grasp tasks.
- tests enforce that hand requirements start from tasks, contacts, and gates.
- future hand examples can be rejected before visual review if they do not pass
  the functional grasp brief.
