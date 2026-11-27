# Five-preview audit — 27 November 2026

The previews below were opened before editing. Their recorded envelopes and
triangle counts are the baseline catalog measurements; envelopes are generated
model bounds, not verified vendor dimensions.

| Asset | Envelope (m) | Tris | Preview observation |
|---|---:|---:|---|
| `recycling-facility/eddy-current-separator` | 6.19 × 1.96 × 2.52 | 1,972 | Feeder, fast belt, rotor shell, splitter, and two discharge bins read as an eddy-current separator. Frame, belt, shell, and recovered cans have separate material controls. No mismatch found. |
| `grid-substation/substation-main-power-transformer` | 7.8 × 7.31 × 5.0 | 9,400 | Tank, radiator banks, high and low bushings, conservator, and auxiliaries read as a power transformer. The visible material roles are coherent. No mismatch found. |
| `water-treatment/vertical-turbine-pump` | 0.65 × 1.444 × 0.769 | 2,276 | Discharge head, side outlet, column, top motor, and separate pedestal read as a vertical turbine pump head. The motor body and six cooling ribs had different controls: the motor changed with `motorFinish`, while its ribs remained `structuralSteel`. Corrected. |
| `wind-energy/offshore-wind-turbine` | 3.415692 × 6.638052 × 1.418 | 3,168 | Three-blade rotor, tapered tower, monopile, transition piece, boat landing, and access ladder read as offshore equipment. No material mismatch found. |
| `industrial-plant/centrifugal-pump` | 1.804 × 0.952 × 0.71 | 4,038 | Volute casing, axial suction, top discharge, bearing frame, coupling guard, motor, and baseplate are visible and distinct. No material mismatch found. |

The audit baseline was `origin/develop` at `7fce1daef`. The full local source
and preview snapshots are in [`samples/`](samples/), with the before/after
pair in [`before/`](before/) and [`after/`](after/). The public pages, source,
and preview for all five samples returned HTTP 200 and matched the local
baseline hashes; details are in [`live-baseline/public-check.json`](live-baseline/public-check.json).

After rendering, the corrected pump preview, eddy-current separator, and main
power transformer were reopened. The pump remains recognizable as a vertical
turbine pump head, with the six motor ribs now matching the motor housing in
blue; the separator and transformer remain recognizable in their existing
distinct material palettes.
