# Check a mechanism at rest and through motion

`evaluate_script` checks an assembly mechanism by default. Its verdict keeps the rest-pose checks separate from the articulated collision sweep:

- At rest, each supported mate checks that both mated bodies meet the joint or provide nearby bearing contact. A measured disconnected joint reports `mechanism.joint-mesh-gap` at error severity and makes the mechanism `broken`.
- The rest-pose check still runs when the collision sweep exceeds its work budget. In that case, a disconnected joint remains `broken`; the sweep can separately report `mechanism.unverified-budget-exceeded` and leave travel unverified.
- If the joint continuity measurement itself is unavailable, `mechanism.joint-mesh-unverified` reports which joint side could not be measured. The mechanism stays `unverified`, even when the collision sweep completes. Missing measurement is not a pass.

The result is local CAD validation of the model's declared mates and geometry. It does not claim a physical simulation, a deployed result, or hardware acceptance.

## Connector-placed descendants

A part placed with `connect` stays attached to its target connector. When a parent moves through a mate, the evaluated `model()` and `solvedModel()` scenes carry that same rigid motion through connected descendants. A descendant with its own mate or legacy joint keeps that solver placement.

The [rest-pose continuity demo and evidence bundle](../demos/rest-joint-continuity-925/README.md) shows an annular bearing whose mesh and exact BREP joint-distance queries are unavailable while the travel sweep is skipped at budget zero.
