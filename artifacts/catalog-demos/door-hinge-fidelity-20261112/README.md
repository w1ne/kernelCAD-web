# Door-hinge pivot fidelity — 12 November 2026

This is a CC0 illustrative scene asset, not certified hardware or a solved
mechanism. The repair changes real geometry, not the palette.

The original five knuckles were solid cylinders surrounding a separate pin.
The repaired source makes two connected leaf/knuckle bodies with a continuous
4.2 mm bore and a separate 3.6 mm pin (0.3 mm nominal radial clearance).
Twelve leaf mounting bores remain open underneath decorative screw caps.

`before-after.png` shows the exact native-exported geometry. Top: complete
asset. Bottom: inspection view with only the separately named pin and screw
caps hidden; no structural faces were removed. The original solid barrel end
and the repaired open bore are directly visible. All colors are unchanged.
The preview triangle count rises from 1440 to 1772; the budget rises from 1600
to 1800 to accommodate actual bore walls and fused leaf interfaces.

Verification on base d6ccf5b67fef1a52e7a980ae44ab6d4b28fe4173:
- Original source: all three size cases fail the axial pivot-ray check.
- Repaired source: all three size cases pass open-passage, connected-leaf,
  retained barrel walls, twelve mounting-bore and separate-pin checks.
- Four existing connected-component/interface regression cases also pass.
- Planar source dimensions remain 64 x 40 mm at the standard setting.
  Round Y-extrema allow 0.1 mm tessellation error in the GLB test.
- Only the door-hinge index record changes; all 2402 core records remain.
- ESLint passes on the new regression test.

Commands:
```sh
NODE_OPTIONS=--max-old-space-size=2048 node node_modules/vitest/vitest.mjs run \
  tests/integration/catalog/doorHingeFidelity.test.ts \
  tests/integration/catalog/standardComponentInterfaces.test.ts \
  --maxWorkers=1 --no-file-parallelism
node --import tsx scripts/renderCatalogPreviews.ts door-hinge
node --import tsx scripts/rebuildCatalogEntries.ts standard-components/door-hinge
node node_modules/eslint/bin/eslint.js tests/integration/catalog/doorHingeFidelity.test.ts
```

Local dependencies were reused (Node 22.23.4, Vitest 4.0.18, tsx 4.21.0).
Clean-install CI, review, deployment and production byte verification are
separate gates. No manufacturer identity, working joint, load rating, thread
or fabrication tolerance is claimed.

[Native-render comparison clip](native-comparison.mp4) — a six-second still comparison, not a Studio browser recording.
