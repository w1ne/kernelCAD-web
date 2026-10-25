---
id: assembly-stability-support-polygon
title: Approximate static stability — a cantilever needs a hold until its support
tags: [assembly, kinematic, static-hold]
keywords:
  - needs-hold
  - support polygon
  - centre of mass projection
  - cantilever before its support
  - build sequence stability
  - gravity direction build orientation
when_to_use: >-
  A build sequence must say which steps need an external hand, fixture or
  clamp. Run verify({ check: 'assembly-path', sequence: true, stability: true })
  and read sequence.needsHold / Step.heldBy. The check projects each part's
  centre of mass onto its contacts with already-stable parts; it is not a
  physics simulation. Declare gravity for a different build orientation and
  fixtures for parts that are present from step 1.
example: examples/assemblies/assembly-stability-bracket.kcad.ts
---

The base is a pedestal plus a lower shelf. The cantilever rests only on the
pedestal, so its build step is `needs-hold`; the narrow support on the shelf is
built later. The stable support step reports `heldBy: ['base']`.

```typescript
const arm = assembly('stability-bracket');
const pedestal = box(4, 4, 2, true).translate(0, 0, 1);
const shelf = box(10.1, 4, 1, true).translate(6.95, 0, 0.5);
const post = box(0.5, 0.5, 3.5, true).translate(-1.75, -1.75, 1.75);
const base = pedestal.union(shelf).union(post);
const cantilever = box(13, 2, 0.99, true).translate(5.5, 0, 2.505);
const support = box(0.5, 2, 0.98, true).translate(11.25, 0, 1.5);
arm.part('base', base, { material: 'aluminum-6061' });
arm.part('z-cantilever', cantilever, { material: 'aluminum-6061' });
arm.part('a-support', support, { material: 'mild-steel' });
return arm.model();

// verify({ check: 'assembly-path', sequence: true, stability: true })
// -> Step 1 z-cantilever: stability 'needs-hold',
//    sequence.needsHold[0].reason 'center-of-mass-outside-support-polygon'
// -> Step 3 a-support: stability 'stable', heldBy ['base']
// -> model.gravity 'approximate-support-projection'
```
