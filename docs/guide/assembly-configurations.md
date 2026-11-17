---
title: Several named sizes of one part in one assembly
summary: A part file declares named parameter sets. Each assembly instance names the file and one set, and the bill of materials groups by that pair.
date: 2026-11-17
kind: guide
status: draft
model: examples/assemblies/configured-bearing-blocks.kcad.ts
video: docs/demos/assembly-configurations/demo.mp4
---

One part file can describe more than one size. `configurations()` names the
sets. `definePart()` returns the solid and publishes the connector frames that
move with those parameters. An assembly does not copy the builder: it points
at the file and the set.

```typescript
configurations({
  compact: { length: 80, width: 50, thickness: 18 },
  wide: { length: 110, width: 70, thickness: 22 },
});
```

```typescript
await arm.instance('block-a', {
  source: '../manufacturing-showcase/bearing-block.kcad.ts',
  configuration: 'compact',
  material: 'aluminum-6061',
  process: 'cnc',
});
```

Each instance evaluates in a fresh parameter table. A `length` parameter on
the assembly does not change `length` inside the part, and the compact
instance does not see the wide instance's values. The instance is read from
the part file's resolved path. A geometry file the part names with a literal
path, such as `lib.fromSTEP('housing.step')`, is resolved beside that part
file and is part of the same read, so replacing the file rebuilds the solid.
A path the part computes is read on every instance. The repeated compact block
in `examples/assemblies/configured-bearing-blocks.kcad.ts` is a second
instance of the same set, so the bill of materials reports quantity 2 for
compact and quantity 1 for wide.

A fastened mate places the part's connector on the parent connector. The
example seats each block's `foot` on a pad of the base plate. The mate records
the configuration of the block it attaches.

`instance` throws `feature.invalid-args` when the configuration name is not in
the file, when a value has the wrong type or is outside the parameter's
bounds, or when two configurations of the same file declare different
connector names or types. The failed instance is not added.

This page is local validation of the script. It is not a claim about a
printed part or a deployed service.
