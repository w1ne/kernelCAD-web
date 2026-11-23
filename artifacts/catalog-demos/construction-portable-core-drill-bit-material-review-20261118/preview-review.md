# Construction-equipment five-preview ledger — 2026-11-18

The samples were not listed as targets in any of the six open PR changed-file lists or seven open issue titles/bodies at selection time. The exact audit snapshot is `verification/open-target-check.json`. Pre-edit source and preview files are preserved under `samples/`; the five local rendered previews were opened individually.

Catalog envelopes are software asset bounds, not verified manufacturer dimensions.

| Asset | Preview / envelope / triangles | Semantic and material check |
|---|---|---|
| `construction-equipment/asphalt-paver-screed` | [Rendered preview](samples/previews/asphalt-paver-screed.png); 1.850 × 0.390 × 0.338 m; 92 tris | Reads as a long beam with a central housing. The description says wide finishing screed with folding wings and adjustment links, but neither the wings nor their adjustments are visible. No selected material mismatch; this shape/description gap is recorded for later geometry work. |
| `construction-equipment/rebar-bending-machine` | [Rendered preview](samples/previews/rebar-bending-machine.png); 0.836 × 0.571 × 0.670 m; 1,376 tris | Circular pin-bending table, feed rollers, motor cabinet, stand, formed bar and separate foot pedal make the bender recognizable. Enamel, steel, rebar and pedal rubber are visually separated; no mismatch found. |
| `construction-equipment/masonry-mixer` | [Rendered preview](samples/previews/masonry-mixer.png); 0.798 × 0.897 × 0.678 m; 356 tris | Drum, tilting cradle, motor housing, wheels, frame and push handle read as a portable mortar mixer. The dark rubber, steel drum/frame and painted cradle/motor are distinct; no mismatch found. |
| `construction-equipment/jobsite-tile-saw` | [Rendered preview](samples/previews/jobsite-tile-saw.png); 1.164 × 1.397 × 0.650 m; 1,264 tris | Folding stand, water tray, rails, sliding tile cart, blade guard and motor read as a wet rail saw. Metal, polymer, painted housing and ceramic tile zones are coherent; no mismatch found. |
| `construction-equipment/portable-core-drill-stand` | Before: [local preview](before/portable-core-drill-stand.png); 0.562 × 1.105 × 0.400 m; 92 tris. After: [local preview](after/portable-core-drill-stand.png) | Base, guide column, carriage, feed handle and core barrel read as a simplified drill stand. Before, the `core-bit` barrel shared yellow equipment enamel with the base/column despite the existing exposed-steel control. After, the bit uses structural steel; the painted stand and steel carriage/handle remain distinct. |

The selected material change is limited to the core-bit color assignment. The asphalt-paver-screed silhouette/description gap remains explicitly unresolved; this round does not claim the five assets have passed a manufacturing or semantic-accuracy standard.
