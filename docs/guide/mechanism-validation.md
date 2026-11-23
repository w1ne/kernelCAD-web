# Check a mechanism at rest and through motion

`evaluate_script` checks an assembly mechanism by default. Its verdict keeps the rest-pose checks separate from the articulated collision sweep:

- At rest, each supported mate checks that both mated bodies meet the joint or provide nearby bearing contact. A measured disconnected joint reports `mechanism.joint-mesh-gap` at error severity and makes the mechanism `broken`.
- The rest-pose check still runs when the collision sweep is skipped, either because its work estimate exceeds the budget or because `sweepBudget` forces a skip. A disconnected joint remains `broken`; the sweep can separately report `mechanism.unverified-budget-exceeded` and leave travel unverified.
- If the joint continuity measurement itself is unavailable, `mechanism.joint-mesh-unverified` reports which joint side could not be measured. The mechanism stays `unverified`, even when the collision sweep completes. Missing measurement is not a pass.

The result is local CAD validation of the model's declared mates and geometry. It does not claim a physical simulation, a deployed result, or hardware acceptance.

## Pose overrides on fastened mates

`solve_mates({ poses })` accepts overrides for mate types with solver-supported pose coordinates, such as revolute or prismatic joints. A fastened mate has zero articulation degrees of freedom, so an override for it returns `feature.invalid-args`; the solver does not silently return the unchanged pose as a successful solve. Planar mates also reject overrides because this solver has no planar pose coordinate. Change the mate to a supported articulated type if it is meant to move.

The [fastened-mate pose rejection demo and evidence bundle](../demos/fastened-mate-pose-rejection-1227-20261118/README.md) records the local MCP result and its negative regression test.

## Pair exclusions at rest

At the returned pose, `solvedModel({}, { ignore: [['a', 'b']] })` exempts that symmetric named pair from overlap and rest-pose penetration diagnostics. Mate-gap and joint-continuity checks still run, and the motion sweep still checks the pair at sampled poses. If the excluded pair actually overlaps, `mechanism.ignored-rest-overlap` warns and the mechanism remains `unverified`, even if the sweep completes. The exception alone does not establish physical compatibility.

The [pair-exclusion replay bundle](../demos/rest-contact-ignore-1271/README.md) captures the same overlapping assembly before and after the pair is listed.

## Connector-placed descendants

A part placed with `connect` stays attached to its target connector. When a parent moves through a mate, the evaluated `model()` and `solvedModel()` scenes carry that same rigid motion through connected descendants. A descendant with its own mate or legacy joint keeps that solver placement.

The `Scene` returned directly from `model()` includes default-pose transforms when every referenced mate connector has a vector origin. If any referenced origin is topology-based, those capture-time transforms remain unresolved; the lowered `SceneBackend` resolves them during recompute. Use `solvedModel()` when the capture-time `Scene.parts` values need fully solved transforms before building.

The [capture-time transform handoff demo and evidence bundle](../demos/model-scene-mate-transforms-917/README.md) compares returned `Scene.parts` transforms with the lowered `SceneBackend` for a fastened mate and a connected descendant.

The [rest-pose continuity demo and evidence bundle](../demos/rest-joint-continuity-925/README.md) shows an annular bearing whose mesh and exact BREP joint-distance queries are unavailable while the travel sweep is skipped at budget zero.

## Scalar mate couplings in physics verification

When mates are coupled with `arm.coupleMates(driven, { source, ratio, offset })`, the physics pose sweep samples the independent source coordinate and derives the driven coordinate from that signed relation. The MuJoCo release model carries supported scalar revolute and prismatic couplings as joint equality constraints. The release check measures the relation at each integration observation; a residual beyond 5° for angular coordinates or 0.01 mm for linear coordinates reports `mechanism.coupling-residual`.

A physics pose starts each mate that the sample does not name at coordinate 0, not at the authored `pose`. Each driven coordinate is `ratio × source + offset` from the coordinate that the same physics pose gives its source, through a chain of couplings if there is one. Thus an authored source pose such as `pose: gripDeg` does not put the driven mate out of step with its source at the start of the release check. The [coupled rest-pose demo and evidence bundle](../demos/coupled-physics-rest-20261114/README.md) records the before and after output.

For a `gear-pair` transmission that has a matching scalar coupling, the native release model uses the ideal equality for tooth transfer and excludes contact between adjacent bodies on that declared gear path. Other body contacts remain active. This avoids resolving gear teeth twice through both an ideal ratio and a contact solver. If the physics backend cannot map a declared coupling, `verify({ check: 'physics' })` reports `mechanism.physics-unsupported` and leaves physics coverage false. A passing ratio check validates the authored coordinate relation in the native physics model; it does not calculate tooth-contact forces or certify a physical gear mesh.

## Spur pair geometry

`spurGearPair({ module, teeth, drivenTeeth, faceWidth })` places an external pair at `(m1·z1 + m2·z2) / 2`, turns the driven gear so a tooth space faces the driver, and adds revolute mates, a couple at `−z1/z2`, and a `gear-pair` transmission. The default teeth stay the involute profile.

`await pair.toothInterference({ cycleSamples })` samples one driver tooth, and with `wholeRevolution: true` a separate set of revolution samples. Each pose is an exact BREP distance. Common volume is computed only when that distance is at most 0.0001 mm. The report then samples midpoints beside the lowest-clearance pose, halving that gap for two steps, unless a pose already interferes. `interferenceVolumeFloorMm3` is 0.001 mm³. A common volume strictly above that floor sets `anyInterference` and sets `minClearanceMm` to 0. A positive volume at or below the floor is not interference and does not set `minClearanceMm` to 0. When every sampled pose is in that band, `minClearanceMm` is null. Zero-volume contact (common volume 0 and distance 0) sets `minClearanceMm` to 0 while `anyInterference` stays false. The 0.001 mm³ floor is a fixed absolute volume for every module and face width. Overlap volume is the transverse overlap area times the face width, and similar teeth grow that area with the square of the module, so this floor is a larger share of a tooth on a fine module and a smaller share on a coarse module or a wide face. The published pair and the threshold checks use module 1 mm and a face a few millimetres wide. `anyInterference`, `maxInterferenceVolumeMm3` and `minClearanceMm` aggregate those sampled poses. `sampleLimited` is true, `clearanceScope` is `sampled-poses`, and `unresolvedStepDeg` is the driver-angle gap that still touches the minimum. Those fields do not prove clearance between the samples. The report also measures backlash as the driven pitch-circle arc between the two flank-contact poses. `backlashStepMm` is one flank's remaining bisection bracket. A short centre or a mismatched module reports interference. The numbers are geometry only. They are not tooth strength, stress, or load capacity, and they are not a physics release check.

`await pair.withGeneratingCut({ samples })` is opt-in. It subtracts a discrete union of the driver, posed at N angles over one driver tooth, from a tip-radius blank, then repeats that one space at the driven tooth pitch. `scallopMm` is the chordal sagitta of the driver tip about the pitch point for one step: an upper bound on that tip path, not a measured flank error and not a continuous generating cut.

The worked pair is `examples/cookbook-parity/involute-spur-gear-pair.kcad.ts` (module 1, 20 and 40 teeth). Its evaluate log is the local CAD report. The [rest-pose stills](../demos/spur-gear-pair/README.md) show that same mesh. They are not a motion simulation and not hardware acceptance.

The [12:48 coupled-gear release demo and evidence bundle](../demos/issue-1321-coupled-gear/README.md) records the signed input sweep and native release residual from the regression fixture.

## MJCF and URDF export health

`check_export_health` is separate from `verify({ check: 'physics' })`. It exports the assembly to MJCF and URDF, compiles the MJCF, and runs forward at `qpos0`. The report is local export validation. It is not a drop test, a travel sweep, or hardware acceptance.

`qpos0` is the authored mate pose. A scalar joint's `ref` uses the same coordinate as the physics model: degrees become radians and millimetres become metres. The child body frame is that authored pose, because the compiled model shows the body frame at `qpos0` and then applies `qpos - qpos0`. Joint coordinate 0 stays the connector-aligned pose. A coupled driven joint takes `ratio × source + offset` from that authored source, which is the CAD rest coordinate. A ball joint is not a scalar. MuJoCo keeps its `qpos0` at the identity quaternion and ignores `ref`, so the authored extrinsic XYZ Euler triple is the child body's quaternion. A compiled scalar `qpos0` outside the joint range fails the check. `verify({ check: 'physics' })` still starts each mate that a sample does not name at coordinate 0, and that coordinate is still the connector-aligned pose.

The [authored-rest export health demo and evidence bundle](../demos/export-health-authored-rest-20261117/README.md) records a hinge whose solids overlap at coordinate 0 and are clear at the authored pose, a ball joint whose authored Euler triple is the child body frame, a convex-hull contact that the exact solids do not share, and a declared-mass URDF inertial.

- Rest contacts are read from the compiled model at that `qpos0`. A row is a penetration when the signed distance is more negative than 0.001 mm, and a margin-only contact otherwise. Parent/child body pairs and explicit contact exclusions are left out of both lists. Each reported row also carries the exact CAD intersection volume (`cadExactOverlapMm3`) and the exact CAD distance (`cadDistanceMm`) at the same pose. A collision mesh is often the convex hull of the part. When that hull overlaps and the solids are clear of each other — overlap at or below 0.01 mm³ and CAD clearance greater than 0.01 mm — the row sets `collisionGeomArtefact`. The row stays in the list and does not fail the check. A clearance of zero, a clearance at or below 0.01 mm, or a missing distance is a real contact.
- A visual geom (group 2, group 3, or a `visual-` / `wrap-` name) with a non-zero `contype` or `conaffinity` is reported. A collision mesh that uses the whole-part visual mesh while solid collision pieces were declared is reported too.
- Each inertia row compares the CAD solid with the compiled MJCF body and the URDF inertial. A declared part mass replaces volume times density on both exports, and the inertia tensor is scaled by the same factor. Undeclared density is 2700 kg/m³ on the MJCF side and 1000 kg/m³ on the URDF side. When mass properties cannot be computed, both exports substitute unit inertia (1 kg, diagonal 1e-3 kg·m², centre of mass at the origin) and the row is a fallback. A unit-inertia substitution, a regularized tensor, or a component past the stated tolerance fails the row. A synthesised URDF link from a ball decomposition has no CAD solid and no MJCF body, so it is not a mismatch.

`ok` is true only when real rest contacts, visual findings, inertia rows, and `qpos0` ranges are clean. A collision-geometry artefact does not by itself fail the check.

## Suggested joint limits from geometry

`kinematic.suggestJointRanges(arm, opts)` and `verify({ check: 'joint-range' })` walk each revolute or prismatic joint on its own, from that joint's resolved authored pose. Every other mate stays at its authored pose. The walk goes outward in each direction until a non-exempt pair is within the clearance (default 0.3 mm) or a finite search bound is reached. A coarse step finds a bracket; exact BREP distance bisects it. The reported stop is the clear side of that bracket, so the suggested limit keeps the requested clearance.

The search window is the mate's authored `limitsDeg` or `limitsMm`, or a caller-supplied `search`. A joint with neither is `unknown` (`unbounded`). The tool does not invent a bound. A side the budget or a failed measurement leaves unmeasured is `unknown`, never `no-stop`. `no-stop` means no crossing was found at the sampled poses. It is not continuous proof that the interval is clear. `sweepBudget` defaults to the same 40,000 face-weighted exact probes the mechanism sweep uses, and this check does not raise that cap. A measured gap within 1e-6 mm of the clearance counts as reached, so a running fit modeled on the clearance is a rest finding instead of a stop that flickers from pose to pose.

Parts joined by a mate or a joint-graph joint, pairs declared in `solvedModel({ contacts })`, and `disableCollision` pairs are neighbours or intentional contacts. They are not stops. A contact thinner than one coarse step can be stepped over and still reported as `no-stop`. The [carriage and wall demo](../demos/joint-range-suggestion/README.md) records the suggestion and a short motion up to the clear-side stop.

The return value includes `patch` and `limitsSnippet`. Nothing in the check writes those limits back onto the mate. Applying the snippet is a separate edit.

This walk is not the physics pose sweep. A physics sample starts each mate it does not name at coordinate 0. A joint-range sample starts every other mate at its authored pose, so a nonzero rest pose stays in the measurement.

## Notes in the broken-mechanism banner

The `MECHANISM BROKEN` banner of `kernelcad validate` and strict `kernelcad render` counts only error-severity entries as failures and prints them as `[ERROR]`. Non-fatal entries follow the errors with their own label: `[NOTE]` for an informational entry, such as the drop of a free passive joint, and `[WARN]` for a warning, such as a skipped pose sweep. A note does not make a mechanism broken. The render watermark and the `mechanism_failure_codes` field of `render_preview` list error codes only; `diagnostics` keeps each entry with its severity.
