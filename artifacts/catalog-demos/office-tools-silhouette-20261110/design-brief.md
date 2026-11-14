# Design brief — office writing tools

Refine the existing `office/highlighter` and `office/mechanical-pencil` assets
after their default catalog previews read as flat box stacks. Preserve their
IDs, compact/standard format option, named palettes, and material controls.

- **Highlighter:** rounded rectangular polymer barrel and cap, side pocket clip,
  a visibly angled felt chisel tip, and a small ink-colored tip face.
- **Mechanical pencil:** axial turned barrel with a separate elastomer grip,
  tapered metal nose, exposed graphite lead, click button, and pocket clip.
- **Knobs:** keep material-named colors and existing presets; add a separate
  rubber grip color so lead graphite no longer doubles as the grip material.
- **Geometry:** use native `.kcad.ts` profile, extrusion, revolution, and
  transform calls. Scale the complete object for compact format.
- **Verification:** regenerate all 40 office previews, rebuild the generated
  index, run the catalog quality gate, kit ESLint, catalog integration tests,
  local catalog page checks, and source-driven palette renders. Inspect three
  final previews and the MP4.

These are generic low-poly visualization assets, not branded product replicas
or manufacturing specifications.
