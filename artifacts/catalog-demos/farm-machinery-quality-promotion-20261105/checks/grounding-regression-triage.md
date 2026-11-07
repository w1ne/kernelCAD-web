# Grounding regression triage

The first full catalog integration run stopped at `moldboard-plow` with
`stats.minUpM = -0.01`. A targeted GLB bounds inspection found the lowered
standards extended 10 mm below the share tips. The same source/index audit found
`portable-grain-conveyor` at `-0.005`: its wheel centers were 5 mm below the
wheel radius, and the support feet stopped 140 mm above the base plane.

The plow standards were raised to meet their shares. Conveyor wheels were set to
their radius above the base, and support feet were extended from the frame to the
base plane. `checkCatalogAsset.ts` then reported `minUpM: 0` for both. Their
previews and the full index were regenerated before the final suite run.

The final integration run passed all 4 files and 15 tests, including the full
catalog export and index freshness checks.
