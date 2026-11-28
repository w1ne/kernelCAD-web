# Asset semantic review — 2026-11-28

Follow-up to the [2026-11-27 review](asset-semantic-2026-11-27.md) (PR #1832,
merged as `05c6f5c98`). While that PR was reviewed, the corrected
`water-treatment/vertical-turbine-pump` preview still showed a small grey cube
beside the motor. It is the `terminal-gland` part. It was translated to
x = 280..316 mm, and the terminal cover face is at x = 214 mm, so the gland
floated 66 mm clear of the terminal box.

The gland now hangs from the underside of the terminal box (x = 158..202 mm,
z = 1122..1158 mm, top face on the box bottom at z = 1158 mm). Cable entry from
below is the usual drip-safe arrangement on an outdoor motor. Material
(`stainlessSteel`), controls, presets, triangle count (2,276) and budget (2,800)
are unchanged.

`tests/integration/catalog/verticalTurbinePumpTerminalGland.test.ts` reads
exported-GLB part bounds. It requires the gland to sit on the box underside,
inside the box footprint, and clear of the motor housing, all six cooling ribs and
pedestal, at scale 1, 0.7 and 1.3. On the original source it reports
`not seated on the box underside` and `outside the box footprint`; on the fixed
source it passes 3/3. Logs and before/after renders are in the
[review bundle](../../artifacts/catalog-demos/water-treatment-vertical-turbine-pump-terminal-gland-review-20261128/README.md).

`kernelcad render inspect` shows a pre-existing `mechanism.interpenetration`
badge on this asset before and after the change; the gland is not part of it
(the test checks gland clearance). That badge is not addressed here.

Local software renders and GLB bounds only; no deployment, equipment
performance or hardware acceptance is claimed.

## Shipyard plasma torch head — 2026-11-28

The five-preview industrial/manufacturing audit is recorded in the
[Shipyard review bundle](../../artifacts/catalog-demos/shipyard-plasma-cutting-gantry-head-semantic-review-20261128/README.md).
No clear material or palette mismatch appeared in those five renders. The
selected defect was semantic scope: `plasma-cutting-gantry-head` was titled as a
gantry head while its preview showed a full cutting system, including the table,
floor rails, extraction duct and operator console. The stable ID now describes
the torch head on a short bridge section, with the full machine excluded.

The replacement is 1,024 triangles under a 1,600 budget, with four material
controls and three presets. The focused exported-GLB regression passes, the
Shipyard gate is 70/70 (100%), and `npx vitest run tests/integration/catalog/`
passes 232/232 files and 389/389 tests. The current global quality gate is
2,396/2,402 (99.75%); its six failures are in Grid Substation, Industrial Plant
and Standard Components, and the Shipyard target passes. ESLint passes for the
Shipyard kit and regression test. The catalog index and preview were regenerated.

`kernelcad render inspect` timed out before attaching to its local demo player;
the existing Chrome session remained open and owned helper processes were
cleaned up. The software-rendered before/after PNGs and reviewed MP4 are included
in the bundle. No deployment or physical-machine acceptance was performed.
