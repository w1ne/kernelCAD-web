# Centrifugal impeller

> Centrifugal impeller: 7 swept backward-curved blades.

This is an open impeller. Each blade follows a logarithmic spiral from the eye (r = 17 mm) to the tip (r = 60 mm) and wraps `wrapDeg` against the direction of rotation (+Z), so the tips trail behind: that is what backward-curved means. The extruded blade plan is intersected with a revolved meridional envelope, so each blade is tall at the inlet and low at the outlet. The blades sit on a backplate with a revolved hub nose and a keyed bore. Look at the top-down frames for the spiral sweep, and at the low frames for the height taper from eye to tip. Params: `bladeCount` and `wrapDeg` (choices), plus `backplateThickness`, `boreDia` and `keyWidth`. Checked with `kernelcad evaluate` (clean) and the 7-view sheet. Source: [`centrifugal-impeller.kcad.ts`](centrifugal-impeller.kcad.ts).
