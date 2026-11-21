# Five-preview audit ledger: telecom infrastructure, 2026-11-20

Audit base: `feat/catalog-2000` at `657bd46ca`.
Selection: five telecom mounting, grounding and cable-support assets not in any audit ledger
(`antenna-sector-frame`, `grounding-bar`, `lightning-air-terminal`, `cable-ladder-section`,
`cable-entry-gland-plate`). No open issue or PR targets these assets.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `antenna-sector-frame` | Reads as a flat three-post ladder with a teal top bar and a grey bottom bar. | **Fixed this round.** The `top` brace (500 x 100 x 60 mm) was `powderCoat` while the matching `bottom` brace was `galvanizedSteel`. A welded sector frame is hot-dip galvanized as one piece, so the two brace levels cannot have different finishes. | Fixed with the material: the "triangular" frame had `rail-a/b/c` in one line at y = 0; the stand-off arm met no brace. Still not modelled: no antenna mounting pipes per face, no U-bolts; the clamp is a block, not a pole clamp around a pipe. |
| `grounding-bar` | Reads as a copper bar on two dark standoffs with six stainless studs. | Plausible: copper bar, polymer standoff insulators, stainless studs. | Wrong proportions: the bar is 850 x 95 x 90 mm (real telecom ground bars are 6-13 mm thick); studs are 48 mm diameter posts instead of lug holes with bolts (best next geometry fix). |
| `lightning-air-terminal` | Reads as a tall rod on a teal square base with a collar. | Plausible: galvanized rod and tip, stainless collar; a powder-coated base plate is an accepted finish. | 144 triangles; the tip is a plain cylinder, not a tapered point. |
| `cable-ladder-section` | Reads as a teal ladder tray with grey rungs and three dark cables. | Plausible but weak: teal powder-coated side rails with galvanized rungs is an unusual mix (ladders are usually one finish); not a clear defect. Polymer cable jackets. | Rails 45 x 70 mm boxes instead of C-channel; cables are square bars. |
| `cable-entry-gland-plate` | Reads as a teal plate with four dark glands and four bolt heads. | Plausible: powder-coated plate, polymer glands, stainless bolts. | Plate is 50 mm thick (real gland plates are 2-3 mm); glands are plain cylinders with no lock nut or hex. |

Decision: fix `antenna-sector-frame`. Both brace levels use `galvanizedSteel`; the unused
`powderCoat` control is removed. Three galvanized mounting pipes (76 mm diameter) stand at the
corners of an equilateral triangle on a 260 mm circumradius. Six galvanized braces (`top-brace-*`,
`bottom-brace-*`) join them, and a rear `mid-brace-bc` carries the stand-off arm. A new `polymer`
control drives three pipe caps. Triangles 84 -> 372.

Best next fixes: `grounding-bar` (bar thickness and lug holes) and `cable-entry-gland-plate`
(plate thickness).
