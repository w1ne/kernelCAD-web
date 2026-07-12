# Five-Finger Hand Topology Gate Design

## Problem

The current robot hand can look like a hand while still being mechanically invalid. The next slice must stop that failure mode before geometry iteration continues.

The target remains a five-finger anthropomorphic hand, but the immediate deliverable is not a prettier hand. The deliverable is a deterministic gate that rejects a hand whose fingers, joints, or moving links are not structurally connected and mechanically meaningful.

## First-Principles Check

A robot hand is a load-bearing articulated mechanism, not a visual arrangement of finger-like solids.

The minimum physical truths for this slice are:

- Every moving finger link must transfer load back to the palm/root through mates or declared structural links.
- Every non-fastened joint must connect two real parts through real connector references.
- A revolute finger joint without a supported axis or finite travel limit is not a joint.
- A moving segment that is disconnected, only decorative, or connected through impossible geometry is not part of a working hand.

This gate belongs before reachability, collision sweep, and load simulation. Kinematic and dynamic checks are only meaningful after the mechanism graph is structurally coherent.

## Architecture

Add a deterministic topology review layer under the existing CAD review path:

1. Build a part graph from assembly parts, mates, and declared structural relationships.
2. Identify stable/root parts from physical-use-case declarations, falling back to explicit palm/root naming only in tests or fixtures that intentionally model a hand.
3. Classify moving parts as any part participating in a non-fastened mate.
4. For every moving part, verify a load path to a stable/root part.
5. For every non-fastened mate, verify a joint contract:
   - both parts exist,
   - both connector refs resolve,
   - connector origins and axes are finite,
   - revolute-like joints have finite travel limits,
   - revolute-like joints have support evidence through an existing supported-joint intent or equivalent declared support metadata.
6. Return structured diagnostics through `review_cad` and `design_loop`.

The review should be conservative. If a mechanism omits support metadata, the gate should fail with a repair hint instead of guessing that visual contact is sufficient.

## Diagnostics

Initial diagnostic codes:

| Code | Meaning |
| --- | --- |
| `assembly.connectivity.floating-moving-part` | A moving part has no load path back to a stable/root part. |
| `assembly.connectivity.no-load-path` | A declared load-bearing part cannot transfer force to any stable/root part. |
| `assembly.joint-topology.connector-missing` | A mate references a missing part connector. |
| `assembly.joint-topology.axis-invalid` | A joint connector axis is missing, zero-length, non-finite, or inconsistent. |
| `assembly.joint-topology.missing-limit` | A moving joint lacks finite travel limits. |
| `assembly.joint-topology.unsupported-axis` | A revolute-like joint has no support/bearing intent. |

Diagnostics must include the part or mate name, a plain-language message, and a repair hint that tells the agent what structural evidence to add.

## Integration

- `review_cad` should include topology diagnostics in the same blocking diagnostic stream as physical-use-case reachability.
- `design_loop` should preserve these diagnostics in `reviewFacts` and `nextActionPrompt`.
- The current five-finger hand fixture should fail this gate if it has disconnected links, fake joints, missing limits, or unsupported axes.
- A small clean fixture should pass: palm, two or three articulated links, supported revolute joints, finite limits, and a declared stable root/load path.

## Test Strategy

Write tests before implementation:

1. Unit tests for graph reachability over small synthetic assemblies.
2. Unit tests for joint-contract diagnostics on missing connectors, missing limits, invalid axes, and unsupported revolute joints.
3. Integration test proving `review_cad` emits topology diagnostics.
4. Design-loop test proving topology failures are carried into the next action prompt.
5. Current five-finger hand regression proving the hand is rejected by topology/connectivity before any geometry redesign is accepted.

## Accepted Limitations

- This gate does not prove the hand can grasp an object.
- This gate does not prove collision-free motion.
- This gate does not compute torque or structural stress.
- This gate may reject a visually plausible joint until the model declares support metadata. That is intentional; hidden assumptions are not physical evidence.

## Alternatives Considered

| Option | Description | Decision |
| --- | --- | --- |
| Graph + joint-contract gate | Check load paths, connector validity, limits, and support metadata before kinematics. | Recommended because it tests the minimum physical structure. |
| Geometry contact-only gate | Check touching/floating solids using mesh contact. | Rejected as insufficient; visual contact can still hide fake hinges and unsupported axes. |
| Dynamics simulation first | Use physics simulation before topology checks. | Rejected for this slice; simulation on an incoherent mechanism produces misleading failures. |

## Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| 1 | Build topology/connectivity before more hand geometry work. | The current failure is architectural: the model can be visually hand-like while mechanically disconnected. |
| 2 | Treat missing joint support metadata as blocking. | A revolute axis without support evidence is a fantasy joint. |
| 3 | Preserve first-principles checks in the spec and future plan. | This keeps the agent from optimizing for appearance before physical coherence. |
