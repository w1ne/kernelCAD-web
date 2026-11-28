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
inside the box footprint, and clear of the motor housing, first cooling rib and
pedestal, at scale 1, 0.7 and 1.3. On the original source it reports
`not seated on the box underside` and `outside the box footprint`; on the fixed
source it passes 3/3. Logs and before/after renders are in the
[review bundle](../../artifacts/catalog-demos/water-treatment-vertical-turbine-pump-terminal-gland-review-20261128/README.md).

`kernelcad render inspect` shows a pre-existing `mechanism.interpenetration`
badge on this asset before and after the change; the gland is not part of it
(the test checks gland clearance). That badge is not addressed here.

Local software renders and GLB bounds only; no deployment, equipment
performance or hardware acceptance is claimed.
