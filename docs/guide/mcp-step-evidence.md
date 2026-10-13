# Modeling step evidence

A full local MCP `evaluate_script` result includes `step`. Source-edit tools that
re-evaluate a script forward the same field. Dry runs omit it because they do not
build geometry.

- `validity.status` is `valid`, `invalid`, or `unverified`. Checks cover build
  diagnostics, degraded feature health, and finite volume/bounds. `volume` is in
  mm³. This is build evidence, not a topology or manufacturing certificate.
- `snapshots.status` is `captured` or `unavailable`. Captured results provide
  local `before` and `after` PNG paths plus `out_dir`. The first evaluation has
  only `after`; subsequent evaluations compare the previous active root shape
  to the new root shape. A failed build clears that baseline. Array returns are explicitly unverified
  because their tail feature does not represent all returned geometry.
- `snapshots.frame` records the shared iso view, 512×512 image size, and union
  bounds in mm. Both images use the same camera fit and rendering settings, so
  unchanged geometry stays pixel-aligned even when model extents change.

Set `PW_CDP_URL` to an already-running Chrome/Chromium debugging endpoint and
build the local player with `npm run build:player` before capturing. Automatic
step evidence reuses that browser, closes only its own capture pages and local
server, and does not launch a second browser. Missing attachment, unsupported
BREP export, or render failure returns `unavailable` with an explicit `error`;
it does not change the modeling `ok` result. Paths are on the MCP server, not
remote client files. Each captured bundle retains immutable BREP states, readable
replay scripts, PNGs, and `frame.json`.

For a numeric comparison, subtract the volume in consecutive results. For a
visual comparison, read both PNGs with the recorded frame. Refrain from calling a
step visually verified until its images have been inspected.
