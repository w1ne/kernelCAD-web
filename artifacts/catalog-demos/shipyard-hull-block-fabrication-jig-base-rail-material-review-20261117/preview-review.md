# Five-preview semantic and material ledger — 17 November 2026

The five current rendered previews and source snapshots are retained in
[`samples/`](samples/), with a labeled contact sheet at
[`samples/five-preview-contact-sheet.png`](samples/five-preview-contact-sheet.png).
Dimensions and triangle counts below come from the checked-in catalog index at
the audit baseline. The renders were opened together in a labeled contact sheet
before the source edit.

| Asset | Rendered silhouette and materials | Finding |
| --- | --- | --- |
| `shipyard/caisson-ballast-manifold-stand` | 1.93 × 1.19 × 0.70 m; 484 triangles. The raised four-branch stand, dark handwheels, support feet, and green base read as a pipework skid. | No clear material mismatch. The header/branches are rectangular blocks and the wheels are solid discs, so pipe/valve detail is simplified; left unchanged. |
| `shipyard/electrical-test-cart` | 1.285 × 1.38 × 0.88 m; 452 triangles. The cabinet, lower shelf, push handle, four wheels, and four yellow indicators read as a mobile checkout cart. | No clear material mismatch. Yellow pilot indicators are plausible as a simplified status/control treatment; left unchanged. |
| `shipyard/hull-block-fabrication-jig` | 2.70 × 1.77 × 2.30 m; 420 triangles. Four corner towers, transverse alignment beams, two long base rails, and dark contact pads form an open fixture. | **Selected material mismatch, fixed.** The two same-sized base rails had different finishes: `base-rail-0` was yard green while `base-rail-1` was steel grey. Both base rails now use the existing `yardPaint` control; cross rails, towers, and alignment beams remain structural steel. |
| `shipyard/dock-gate-caisson` | 2.94 × 2.17 × 0.62 m; 336 triangles. A broad caisson body with six steel stiffeners, deck cleats, and paired teal flotation cells is recognizable. | No clear material mismatch; the body, stiffeners, and flotation cells remain visually distinct and role-consistent. |
| `shipyard/ship-lift-cradle` | 3.00 × 0.78 × 1.83 m; 396 triangles. Paired long rails, cross ties, four dark hull pads, and guide rollers read as a transfer cradle. | **Deferred material mismatch.** The paired side rails use different finishes (`yardPaint` and `structuralSteel`). It remains unchanged for a separate review. |

## Basis for the selected correction

The jig's `base-rail-0` and `base-rail-1` have identical 2,700 × 200 × 190 mm
profiles and mirror each other across the fixture. The first rail already used
the yard-finish control, so the second rail now uses that same existing control;
the other frame members retain `structuralSteel`. Only one color argument
changes; no part, dimensions, scale behavior, presets, or triangle budget
changes. The new exported-GLB regression fails on the old mapping and passes on
the corrected one.

Official product-context and comparable appearance-workflow comparisons are
recorded privately in `kernelCAD-private`, dated 2026-11-17. Those references
inform review only; the public asset remains a native kernelCAD model and does
not claim vendor fidelity or a universal shipyard paint standard.
