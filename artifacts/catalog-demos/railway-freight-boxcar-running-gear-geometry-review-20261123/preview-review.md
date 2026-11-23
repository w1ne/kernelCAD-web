# Six-preview audit ledger: railway, 2026-11-23

Audit base: `feat/catalog-2000` at `16c80368b`.
Selection: the 2026-11-21 ledger (`railway-hopper-wagon-running-gear-geometry-review-20261121`)
named `freight-boxcar` as the best next fix in this kit (one-sided wheels, ladders below the frame,
floating couplers). The five other assets are railway cars that no earlier ledger audits:
`caboose`, `passenger-coach`, `dining-car`, `commuter-car` and `subway-car`. The only open PR for
this lane is #1507.

Method: the checked-in default preview of each asset was opened, and every part line in the source
was read against its position and colour control. `freight-boxcar` was also checked with
`npx kernelcad render inspect` (front, right, top and iso views in `inspect/`), before and after.

| Asset | Source / preview SHA-256 (first 12) | Preview check | Finding | Other noted limits (not fixed) |
| --- | --- | --- | --- | --- |
| `freight-boxcar` | `33cd2ec24d65` / `91bb49842a67` | Reads as a brown box on four near-side wheels. A grey coupler block lies on the ground at the left end; two galvanized ladder posts stand from below the underframe. | **Fixed this round.** All four wheels at `y = -170`; the far rail has no wheels. Couplers at z 71-123 are under the 126-218 underframe and stand mostly beyond it, so they float. Ladders run z 72-412 on the near side only and reach below the frame. The description names roof ribs and end ladders; the source has neither. | `mechanism.interpenetration` badge in `render inspect` before and after (overlapping parts; not caused by this change). |
| `caboose` | `c828c1aa8500` / `c7077bd253d6` | Reads as a red caboose with a cupola, end platforms, railings, ladders and a brake wheel. | None on materials or running gear: two bogies, wheels on both rails (`s` loop), trim, glazing and marker glass on separate controls. | Scale: about 11.6 m over couplers at real size, while every other wagon in the kit is a stylised 1.4-1.6 m car. Placed together, the caboose is about eight times larger. |
| `passenger-coach` | `27012fd742bb` / `f619cc415d03` | Reads as a grey coach with six windows on two plain bogie slabs. | Geometry: all four wheels at `y = -170`; windows and doors on the near side only. Materials coherent. | Bogies are 40 mm slabs; no couplers or gangways. |
| `dining-car` | `0485e94487a4` / `bc91641cb8f4` | Reads as a brown coach with six windows and a roof vent. | Geometry: all four wheels at `y = -170`, and no bogie part at all: the wheel tops (z 156) push into the underframe (z 121-203), with no frame, axle or bolster between them. Windows on the near side only. | No galley windows or kitchen-end detail that would separate it from `passenger-coach`. |
| `commuter-car` | `13de62952516` / `d29ad52cda9c` | Reads as a dark grey car with four windows, two doors and two roof air units. | Geometry: all four wheels at `y = -170`. `door-left` (x -336 to -244) overlaps `window-2` (x -270 to -90) by 26 mm, and `door-right` overlaps `window-3` the same way, so a door frame cuts through each window in the preview. The description says "wide double doors"; each door is one 92 mm leaf. | Windows and doors on the near side only. |
| `subway-car` | `52b50aa250a1` / `b74f286fc133` | Reads as a dark grey box car with three windows and two doors. | Geometry: all four wheels at `y = -170`. The description says "rounded-looking front cab"; `front-cab` is a 230 x 335 x 370 mm box that sits within 3 mm of the body box faces, so no cab shape shows. | Windows and doors on the near side only. |

Decision: rebuild `freight-boxcar` (the best next fix named by the 2026-11-21 ledger). The other four
coaches share the one-sided wheel defect and are recorded here, not corrected.

Best next fix in this kit: `dining-car` (no bogies; wheels push into the underframe), then `commuter-car` (doors cut
through windows), `passenger-coach`, `subway-car`; then the 2026-11-21 list (`flatbed-wagon`,
`mail-car`, `lumber-wagon`, `baggage-cart`). Kit-level: `caboose` scale against the stylised wagons.
