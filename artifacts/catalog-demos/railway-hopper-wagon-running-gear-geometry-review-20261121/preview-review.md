# Six-preview audit ledger: railway, 2026-11-21

Audit base: `feat/catalog-2000` at `6bb51647e`.
Selection: the telecom-infrastructure and mining kits are fully ledgered, so this round moves to the
`railway` kit. The 2026-11-14 ledger (`railway-tank-wagon-bogie-spring-material-review-20261114`)
recorded `hopper-wagon` as a geometry defect not yet corrected, and named `freight-boxcar`,
`flatbed-wagon` and `lumber-wagon` as wagons to check for one-sided wheel sets. No ledger audits
those three, `mail-car` or `baggage-cart`. The only open PR on the repository for this lane is #1507;
open PR search for `hopper` and open issue search for `railway` return no results.

Method: the checked-in default preview of each asset was opened, and every part line in the source
was read against its position and colour control. `hopper-wagon` was also checked with
`npx kernelcad render inspect` (front, right, top and iso views in `inspect/`), before and after.

| Asset | Source / preview SHA-256 (first 12) | Preview check | Finding | Other noted limits (not fixed) |
| --- | --- | --- | --- | --- |
| `hopper-wagon` | `581cf3e4655e` / `b6b91b303836` | Reads as a closed grey box with two grey top rails on four wheels. No pocket and no slope sheet shows. | **Fixed this round.** All four wheels are at `y = -165`; the far rail has no wheels. The 330 mm `hopper-body` box covers the two sloped `left/right-slope` parts, so the silhouette is a boxcar with no roof, not a hopper. Default `railSteel` `#626b70` and `paintedSteel` `#4a5358` are near the same grey, so the body and the running gear do not separate. | `mechanism.interpenetration` badge in `render inspect` before and after (overlapping parts, not caused by this change). |
| `freight-boxcar` | `33cd2ec24d65` / `91bb49842a67` | Reads as a brown boxcar with a sliding door and door rail. | Geometry: all four wheels at `y = -170`. The two `ladder-*` boxes stand from z 70 to 410 on the near side only and reach below the underframe. Couplers are at z 69-121, 3 mm under the underframe and mostly beyond it. Materials coherent. | Door, rail and ladders on the near side only. |
| `flatbed-wagon` | `2c17418d56d8` / `00424cff5580` | Reads as a timber-deck flat wagon with four corner stakes. | Geometry: all four wheels at `y = -170`. Materials coherent (timber deck, painted stakes). | No couplers, no tie-down rings although the description names them. |
| `lumber-wagon` | `840beaa5feee` / `816c4fbb992d` | Reads as a flat wagon with end bulkheads and five logs. | Geometry: two wheels only, both at `y = -170`. Materials coherent. | Logs use the deck `timber` control; acceptable for wood. |
| `mail-car` | `b45a1abdece7` / `1cd60ab57814` | Reads as a blue railway van with two doors, two small windows and two roof vents. | Geometry: all four wheels at `y = -170`. Materials coherent. | Doors and windows on the near side only. |
| `baggage-cart` | `3a8f0d241247` / `92d74bc5345e` | Reads as a two-wheel platform trolley with a push frame. | Geometry: both wheels sit on the near edge (`x = ±240`, `y = -188`) with their axes along Y, so they cannot share an axle along that edge and would roll sideways. Materials coherent (rubber tyres, painted frame, stainless rail). | No axle or wheel hub. |

Decision: rebuild `hopper-wagon` (the defect the 2026-11-14 ledger left open). The other five have the
same class of defect (wheel sets on one side). They are recorded here, not corrected, so a later round
can take them one at a time.

Best next fix in this kit: `freight-boxcar` (one-sided wheels, ladders that reach below the frame,
floating couplers), then `flatbed-wagon`, `mail-car`, `lumber-wagon`; `baggage-cart` wheel
orientation.
