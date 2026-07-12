# Five-Finger Hand Topology Repair Design

## Problem

The five-finger hand now fails the topology gate for the right reason: it is not mechanically complete. The current blockers are unsupported revolute axes on finger joints and a grasp-cylinder load with no structural path to the palm/root.

The next pass must make the current hand satisfy the topology gate without hiding the failure behind visual edits or fake drive declarations.

## First-Principles Check

A finger joint can be driven or passive, but it cannot be unsupported. For a revolute joint to be physically meaningful, the support side needs bearing or bracket evidence tied into the mate endpoint that carries the shaft. A passive PIP/DIP hinge should not have to pretend it has its own actuator; it should declare support as support.

A grasp object is different from a structural hand part. It is useful as a contact/load target, but the topology graph should not require the object itself to be mated into the hand assembly unless the scenario is explicitly modeling a grasped object as a held payload with structural contact closure.

## Architecture

Add a small passive joint-support intent alongside the existing driven `mechanicalJoint(...)` intent.

1. Capture `assembly.jointSupport(name, opts)` records with:
   - `mate`: revolute mate being supported,
   - `shaft`: support-side part or shaft part,
   - `supports`: one or more support-side parts,
   - `output`: moving side of the mate,
   - optional `requiredSupport` metadata matching the existing support contract shape.
2. Extend `reviewJointTopology(...)` so a revolute mate is supported by either:
   - a complete driven `mechanicalJoint(...)`, or
   - a complete passive `jointSupport(...)`.
3. Apply the new support intent to the five-finger hand:
   - all PIP/DIP hinges,
   - little/ring MCP hinges,
   - any remaining revolute not already backed by existing MCP drive support.
4. Treat the grasp cylinder as a non-structural contact target for topology, not a moving hand link with a required mate path. It should still remain available to physical-use-case and reachability checks.

## Diagnostics And Behavior

- The current hand should produce no `reviewJointTopology(...)` diagnostics.
- `review_cad` should stop reporting `assembly.joint-topology.unsupported-axis` for the hand.
- The topology repair must not silence physical-use-case reachability, load, collision, or visual gates.
- Existing fake-support tests must still fail when support parts are unrelated to the support-side endpoint.

## Test Strategy

1. Unit test the passive support intent capture and stored records.
2. Unit test `reviewJointTopology(...)` accepts a passive supported revolute hinge.
3. Unit test unrelated passive supports do not satisfy the topology gate.
4. Update the five-finger hand regression so topology diagnostics are empty.
5. Keep existing review/design-loop integration tests green.

## Accepted Limitations

- This pass does not prove the hand can grasp the cylinder.
- This pass does not solve dynamic simulation.
- This pass does not redesign geometry or add transmissions for every passive finger joint.
- A contact target marked non-structural is still only a modeling target; grasp plausibility remains the job of the physical-use-case/reachability gates.

## Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| 1 | Add passive joint-support intent instead of abusing `mechanicalJoint(...)`. | Passive hinges need support evidence but not fake actuators. |
| 2 | Reuse the existing support-side fastened-path rule. | Support evidence must be grounded in the mate endpoint, not a matching string. |
| 3 | Keep grasp-cylinder out of topology moving-part/load-path requirements. | It is a contacted object, not part of the hand structure. |
| 4 | Stop at topology clean, not full grasp success. | The next gate should fail honestly if reachability/load/dynamics are still invalid. |
