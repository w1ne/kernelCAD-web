# Assembly placement diagnostics

When mate forward kinematics places a non-root part, it supplies that part's
pose. If the part also has a non-zero authored `at:` placement, kernelCAD emits
the informational diagnostic `assembly.placement-ignored-by-mate-fk` because
the mate-derived pose takes precedence.

The diagnostic resolves parameter-driven `at:` values from the assembly's
current parameter table before checking for a conflict. For example, an
`at: [offset, 0, 0]` with `offset = param('offset', 125)` reports the resolved
125 mm value. The first assembly part keeps its authored placement, and an
`at:` synthesized by `connect()` is not reported as a conflict.

The [reproduction bundle](../demos/param-placement-note-at-917/README.md)
contains the model, capture source, emitted diagnostic, verification record,
and a short MP4. This evidence covers a local model build and compiler
diagnostic only; it does not claim a physics run, deployed behavior, or hardware
acceptance.
