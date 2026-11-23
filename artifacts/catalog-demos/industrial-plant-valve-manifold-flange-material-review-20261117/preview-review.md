# Five-preview semantic review — 17 November 2026

All five images were rendered catalog previews on the current branch. The public
valve-manifold page returned HTTP 200; its preview SHA-256 matched the local
baseline. The current open catalog PR is #1507. Its changed catalog sources are
eight other industrial-plant assets, and the open issue list contains no target
for these five IDs.

| Asset | What the preview shows | Review |
| --- | --- | --- |
| `industrial-plant/valve-manifold-station` | Three risers with valves and side outlets on a skid support. | Recognizable. The three outlet flange rings use the yellow `safetyPaint` control even though the adjoining outlet and valve bodies use `steel`. Selected material mismatch: move only the flange rings to `steel`; retain yellow on the skid and handwheels. |
| `industrial-plant/industrial-stair-tower` | Two landings and a central stair flight between structural posts. | Reads as an access tower. The stair flight has no visible side handrail; recorded as a geometry follow-up, not changed in this round. |
| `industrial-plant/grating-walkway-module` | Raised rectangular walkway, rails, and two support legs. | The label says grating, but the preview has a solid deck slab. Recorded as a geometry follow-up, not changed in this material review. |
| `industrial-plant/pipe-rack-bay` | Three parallel utility runs on a braced support frame. | Recognizable pipe rack. The different pipe finishes may communicate service lines; no material mismatch selected. |
| `industrial-plant/vertical-cage-ladder` | Ladder rails with a broad filled oval cage region; rungs are mostly obscured. | Does not read clearly as an open cage ladder. The cage geometry needs review; recorded, not changed in this material-only correction. |

## Product context checked on 17 November 2026

- [Parker's 3-valve manifold catalog](https://www.parker.com/content/dam/Parker-com/Literature/Instrumentation-Products-Division/Catalogs/P-CAT-P3%286%29M3H-001.pdf)
  lists stainless-steel manifold bodies and metal pressure components.
- [Swagelok's manifold catalog](https://boston.swagelok.com/en/industries/swagelok-products/valves/manifolds)
  documents stainless-steel and carbon-steel manifold body options.

These are material references for generic industrial equipment, not a claim that
the kernelCAD asset duplicates either vendor's product. The asset remains a
low-poly scene model, not a vendor-specific design or engineering specification.
