# Check a mechanism at rest and through motion

`evaluate_script` checks an assembly mechanism by default. Its verdict keeps the rest-pose checks separate from the articulated collision sweep:

- At rest, each supported mate checks that both mated bodies meet the joint or provide nearby bearing contact. A measured disconnected joint reports `mechanism.joint-mesh-gap` at error severity and makes the mechanism `broken`.
- The rest-pose check still runs when the collision sweep is skipped, either because its work estimate exceeds the budget or because `sweepBudget` forces a skip. A disconnected joint remains `broken`; the sweep can separately report `mechanism.unverified-budget-exceeded` and leave travel unverified.
- If the joint continuity measurement itself is unavailable, `mechanism.joint-mesh-unverified` reports which joint side could not be measured. The mechanism stays `unverified`, even when the collision sweep completes. Missing measurement is not a pass.

The result is local CAD validation of the model's declared mates and geometry. It does not claim a physical simulation, a deployed result, or hardware acceptance.

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

For a `gear-pair` transmission that has a matching scalar coupling, the native release model uses the ideal equality for tooth transfer and excludes contact between adjacent bodies on that declared gear path. Other body contacts remain active. This avoids resolving gear teeth twice through both an ideal ratio and a contact solver. If the physics backend cannot map a declared coupling, `verify({ check: 'physics' })` reports `mechanism.physics-unsupported` and leaves physics coverage false. A passing ratio check validates the authored coordinate relation in the native physics model; it does not calculate tooth-contact forces or certify a physical gear mesh.

The [12:48 coupled-gear release demo and evidence bundle](../demos/issue-1321-coupled-gear/README.md) records the signed input sweep and native release residual from the regression fixture.
