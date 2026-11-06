# Solar energy kit

Forty existing CC0 visualization assets for PV modules, mounting structures,
tracking, power conversion, storage, and field service. Every model keeps its
scale control and now exposes two to four material-named color controls plus
`fieldService` and `highVisibility` presets.

The models keep their original IDs. PV modules show separate dark glass, light
frames, and galvanized supports. The single-axis tracker has an eight-module
tilted table with visible cell divisions; the cleaning robot has idler wheels
inside its tracks; the battery container has paired access doors, vents,
corrugated sides, hinges, and end-mounted cooling housings.

## Example: tracker material controls

[`single-axis-solar-tracker.kcad.ts`](single-axis-solar-tracker.kcad.ts) exposes
editable frame aluminum, solar glass, galvanized steel, and cell-busbar colors.
Its `fieldService` and `highVisibility` presets provide two complete appearance
schemes. The rendered [tracker preview](previews/single-axis-solar-tracker.png)
shows the module grid, torque tube, support piers, and drive housing.

The [rooftop array preview](previews/rooftop-pv-array.png) separates panel glass,
frames, and rails. The [battery container preview](previews/solar-battery-container.png)
shows its louvered service face and corrugated end. The [quality handoff](../../../artifacts/catalog-demos/solar-energy-quality-20261106/README.md)
retains source hashes, material assignments, preview and index evidence, local
checks, and the inspected MP4.

These are stylized low-poly scene assets, not engineering models. Their
dimensions, electrical ratings, clearances, performance, and installation
suitability are not validated by catalog rendering or local tests.
