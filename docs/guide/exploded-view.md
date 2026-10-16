# Ordered exploded view planning

`explode_view` computes per-part offsets, a reversible assembly timeline and a
camera framing plan from
part measurements. Pass `{ parts: [{ name, center, size }] }` in millimetres, or
the `parts` array from a LabWired handoff with `ref`, `position_mm.value` and
`physical.bbox_mm` (or the compact `bbox_mm.value` form). Parts without usable
placement or bbox values are skipped and reported. Explicit `assembly_order` takes precedence over
`handoff.assembly_order` / `handoff.assembly.order`; missing entries are appended
in declaration order and reported. Without an order the input declaration order
is used.

For a handoff part with only an XY placement, the planner treats that point as
the bbox footprint center on the board's top plane and sets the bbox center Z
to half its height. An explicit third position coordinate is preserved.

Choose `mode: 'axis'` (default) to move parts along `axis` (default +Z), or
`mode: 'radial'` to move each part away from the assembly centroid. The result
starts with explode offsets and gives each part a
sequential scalar track from 1 (exploded) to 0 (assembled), plus `reverseTracks`
for disassembly. It also returns `param_declarations`, a ready-to-paste block
of named `param(name, 0, { min: 0, max: 1 })` declarations, per-part
`part_transforms` expressions to apply to existing shapes before passing them
to `assembly.part()`, and
`animation_tracks` / `reverse_animation_tracks` with the `part` metadata removed
for direct use by `animationView`. `script_fragment` combines the declarations
and forward `animationView` call. Apply each returned offset to that part's
translation by multiplying each offset component by the matching declared
parameter variable.
It also returns `cameraPlan` with a target, suggested distance
and start/end keyframes for assembled/exploded framing. These camera keyframes
are guidance; `animationView` and `capture_animation` animate part parameters,
not cameras. Apply those offsets to each part's existing shape with the
returned `part_transforms` expression before passing it to `assembly.part(...)`,
and put the returned keys into `animationView({ name, tracks })`. Studio's
existing Animation tab plays that authored model timeline and `capture_animation`
captures the same record to MP4. This tool computes a plan; it does not rewrite a
model script or apply offsets to the active viewport.

Axis offsets use each successive order index times its projected bounding-box extent;
radial offsets use the same spacing progression away from the assembly centroid.
Both use the requested positive spacing. This is a visual planning heuristic, not a
collision or assembly-path check. Run the existing interference and assembly
path checks separately when physical insertion feasibility matters.

Demo source, the handoff-derived plan, the schematic MP4 and capture provenance
are bundled in [the exploded-view demo](../../artifacts/argon-exploded-view/README.md).
