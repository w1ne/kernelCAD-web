# Assembly placement diagnostics

When mate forward kinematics places a non-root part, it supplies that part's
pose. If the part also has a non-zero authored `at:` placement, kernelCAD emits
the informational diagnostic `assembly.placement-ignored-by-mate-fk` because
the mate-derived pose takes precedence.

The diagnostic resolves parameter-driven `at:` values from the assembly's
current parameter table before checking for a conflict. For example, an
`at: [offset, 0, 0]` with `offset = param('offset', 125)` reports the resolved
125 mm value. A world-fixed assembly root keeps its authored placement, and an
`at:` synthesized by `connect()` is not reported as a conflict.

For a parameter-driven `at:`, the scene uses the current value consistently
for both part geometry and mate connector frames. Editing the parameter does
not separate the part from the point used by its mate. The
[resolver parity bundle](../demos/assembly-at-resolver-parity-917/README.md)
compares the measured scene before and after a parameter edit.

The [reproduction bundle](../demos/param-placement-note-at-917/README.md)
contains the model, capture source, emitted diagnostic, verification record,
and a short MP4. This evidence covers a local model build and compiler
diagnostic only; it does not claim a physics run, deployed behavior, or hardware
acceptance.

## Declare the fixed base

Use the existing virtual joint to declare which part is fixed to world:

```ts
arm.virtualJoint('world-base', {
  type: 'fixed', parentFrame: 'world', childLink: 'base',
});
```

The base retains its authored placement even when it is not the first declared
part. Mate solving, captured scenes, lowered geometry and topology review use
that same root. A `floating` or `planar` joint does not fix a base. A fixed joint
to an internal parent frame declares a relative connection, not a world anchor.
An unknown child name cannot supply a valid root.

Without an explicit fixed world root, the solver keeps the first-part fallback.
Review retains `assembly.connectivity.assumed-root` so that a fallback placement
is not mistaken for an authored mounting condition. A physical use case needs its
real loads or contacts; do not invent a load to declare a fixed base.

The [fixed-world-root bundle](../demos/fixed-world-root-20261122/README.md)
contains a two-body placement fixture, source-bound OCCT bounds and a short MP4.
It checks a non-first base at X=20 mm while a slide travels from X=20 to X=35 mm.
The fixture verifies local kinematic placement. It is not a manufactured guide
or a load, physics or hardware qualification.
