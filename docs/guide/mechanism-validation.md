# Check a mechanism at rest and through motion

`evaluate_script` checks an assembly mechanism by default. Its verdict keeps the rest-pose checks separate from the articulated collision sweep:

- At rest, each supported mate checks that both mated bodies meet the joint or provide nearby bearing contact. A measured disconnected joint reports `mechanism.joint-mesh-gap` at error severity and makes the mechanism `broken`.
- The rest-pose check still runs when the collision sweep exceeds its work budget. In that case, a disconnected joint remains `broken`; the sweep can separately report `mechanism.unverified-budget-exceeded` and leave travel unverified.
- If the joint continuity measurement itself is unavailable, `mechanism.joint-mesh-unverified` reports which joint side could not be measured. The mechanism stays `unverified`, even when the collision sweep completes. Missing measurement is not a pass.

The result is local CAD validation of the model's declared mates and geometry. It does not claim a physical simulation, a deployed result, or hardware acceptance.

The [rest-pose continuity demo and evidence bundle](../demos/rest-joint-continuity-925/README.md) shows an annular bearing whose mesh and exact BREP joint-distance queries are unavailable while the travel sweep is skipped at budget zero.

## Scalar mate couplings in physics verification

When mates are coupled with `arm.coupleMates(driven, { source, ratio, offset })`, the physics pose sweep samples the independent source coordinate and derives the driven coordinate from that signed relation. The MuJoCo release model carries supported scalar revolute and prismatic couplings as joint equality constraints. The release check measures the relation at each integration observation; a residual beyond 5° for angular coordinates or 0.01 mm for linear coordinates reports `mechanism.coupling-residual`.

For a `gear-pair` transmission that has a matching scalar coupling, the native release model uses the ideal equality for tooth transfer and excludes contact between adjacent bodies on that declared gear path. Other body contacts remain active. This avoids resolving gear teeth twice through both an ideal ratio and a contact solver. If the physics backend cannot map a declared coupling, `verify({ check: 'physics' })` reports `mechanism.physics-unsupported` and leaves physics coverage false. A passing ratio check validates the authored coordinate relation in the native physics model; it does not calculate tooth-contact forces or certify a physical gear mesh.

The [12:48 coupled-gear release demo and evidence bundle](../demos/issue-1321-coupled-gear/README.md) records the signed input sweep and native release residual from the regression fixture.
