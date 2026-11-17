# Industrial-plant semantic preview audit — 2026-11-17

PR #1258 was reviewed before selection: it is merged, all listed CI checks are
successful, and GitHub has no review event recorded. Fifteen currently open PRs
were checked by changed source path, and open issue searches were run for each
candidate ID; none targets these five assets. The unrelated merged fixes #1298,
#1305, #1307 and #1308 touch other assets. The checked-in PNGs below were opened
at the current branch head.

| Asset | Preview observation | Decision |
| --- | --- | --- |
| `industrial-plant/machine-guard-enclosure` | Four corner posts and the open service-door area make the guard enclosure recognizable. The side and rear infill render as opaque plates even though the source comment says “mesh-like”; that is a geometry/description follow-up, not a material correction. | No material mismatch selected; unchanged. |
| `industrial-plant/electrical-control-cabinet` | Tall double-door enclosure, plinth, vent slots, handles, display and indicator lamps read as a control cabinet. One door is safety gold and the other steel grey; this can be an intentional door/section marking. | No unambiguous material mismatch; unchanged. |
| `industrial-plant/chemical-metering-skid` | Twin pump blocks, diaphragms, shared header, control box and skid read as a compact dosing package. The yellow skid and accents are consistent with a deliberate safety-painted package. | No material mismatch selected; unchanged. |
| `industrial-plant/process-reactor-vessel` | Cylindrical shell, roof assembly, side port, platform and ladder read as a reactor vessel. The roof lip and three welded shell stiffener rings were safety gold while the shell was steel grey. | **Material mismatch fixed:** all four rings now use the existing steel control. Safety paint remains on the nozzle, supports, ladder rails and access platform. |
| `industrial-plant/steel-access-gate` | Gate posts, horizontal rails, vertical infill bars and toe plate are recognizable; the high-visibility infill finish is coherent with an industrial access barrier. | No material mismatch selected; unchanged. |

The material decision is specific to this asset's existing two-color palette:
the rings are named as shell stiffeners / roof lip and are modeled as vessel
steel parts. Vessel manufacturers specify finishes to the application, so this
change does not assert a universal paint rule. Bendel's [pressure-vessel and
reactor specifications](https://www.bendel.com/pressure-vessels-reactors-design-specifications)
describe welded accessories and multiple available finishes and colors.

The original source and preview hashes are in `before/sha256s.txt`. The asset
source, bounds, parts, controls, presets and geometry remain unchanged apart
from four color assignments. Both previews show 612 triangles under the 1,400
triangle budget. The before index row is retained in `before/index-row.json`.
