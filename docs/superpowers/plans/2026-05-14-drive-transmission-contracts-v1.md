# Drive Transmission Contracts v1

Date: 2026-05-14
Scope: next kernelCAD mechanism-review slice

## Problem

The current robot arm can declare mates, mate couplings, and mechanical joint
intent, but the review loop still accepts a weak physical story: a servo can be
near a joint without a modeled horn, shaft, linkage, gear, belt, tendon, or
other transmission body that actually transfers motion and load.

This makes `coupleMates()` too easy to abuse. It proves a kinematic relation,
not a physical coupling.

## Research Notes

Mature CAD systems separate joint DOF from joint relations:

- Onshape has mate relations for gear, rack-and-pinion, screw, and linear
  relations between mate DOFs. The relation succeeds only when selected mates
  expose the required DOF.
- Fusion uses motion links to coordinate multiple joints at a ratio.
- SOLIDWORKS mechanical mates include gear, rack-pinion, screw, cam, slot,
  hinge, and universal-joint style relations. Its docs explicitly note that
  rack-and-pinion mates do not prevent interference, so collision/interference
  remains a separate check.
- FreeCAD Assembly has gear and belt joints that couple revolute joints by
  ratio.

Robot hand and gripper designs add the missing physical layer:

- Yale OpenHand Model T uses one actuator through a pulley-tree differential to
  drive underactuated fingers.
- Aero Hand Open uses tendon-driven actuation, one motor per finger, passive
  DIP/PIP coupling, and adaptive MCP coupling.
- Open-source hands such as HRI hand and BiDexHand use four-bar, crossed
  four-bar, cable, pulley, and differential mechanisms to make coupling real.

The slice should therefore add a kernelCAD concept that sits between
`coupleMates()` and `review_cad`: a declared, inspectable physical transmission
path.

## Proposed API

Add `arm.transmission(name, opts)`:

```ts
arm.transmission('left-finger-drive-linkage', {
  kind: 'direct-horn',
  sourceMate: 'grip',
  drivenMates: ['left-curl'],
  actuator: 'grip-servo',
  input: 'grip-driver',
  output: 'left-finger',
  path: ['grip-driver', 'left-link-rod', 'left-finger'],
});
```

Supported `kind` values for v1:

- `direct-horn`: actuator output is coaxial or linked directly to the driven
  mate.
- `link-rod`: servo horn or crank drives a rod to a finger/link joint.
- `four-bar`: planar closed-chain linkage with named crank/coupler/rocker
  parts.
- `gear-pair`: two revolute mates coupled by pitch radii or tooth counts.
- `belt`: two revolute mates coupled by pulleys and belt span parts.
- `tendon`: cable/tendon routed through pulleys or guides.

Keep the v1 schema permissive enough for agents, but strict about named parts
and mates:

```ts
type TransmissionKind =
  | 'direct-horn'
  | 'link-rod'
  | 'four-bar'
  | 'gear-pair'
  | 'belt'
  | 'tendon';

interface TransmissionIntentOpts {
  kind: TransmissionKind;
  sourceMate: string;
  drivenMates: string[];
  actuator?: string;
  input?: string;
  output?: string;
  path: string[];
  ratio?: number;
  notes?: string;
}
```

## Review Behavior

Add a new deterministic review module:

`src/lib/mates/mechanicalTransmission.ts`

Diagnostics:

- `assembly.transmission.missing-for-coupled-mate`
  - error
  - emitted when `arm.coupleMates(driven, { source })` exists but no
    transmission names the same source/driven pair.
- `assembly.transmission.part-missing`
  - error
  - emitted when `actuator`, `input`, `output`, or a `path` part is not an
    assembly part.
- `assembly.transmission.mate-missing`
  - error
  - emitted when `sourceMate` or a driven mate does not exist.
- `assembly.transmission.path-disconnected`
  - error
  - emitted when consecutive path parts are not connected by a fastened or
    articulated mate, or do not have a known contact/connector relation.
- `assembly.transmission.kind-under-specified`
  - warning
  - emitted for kinds that need more geometry in future versions but pass the
    v1 named-path contract.

Integrate diagnostics into `review_cad` and `design_loop` fitness:

- errors become blocking reasons
- warnings become review facts unless allowed explicitly
- `inspect_assembly` includes `transmissions` and transmission review facts

## Minimal Implementation Plan

1. Capture API
   - Add `TransmissionIntentRecord` and opts types to `src/capture/assembly.ts`.
   - Implement `Assembly.transmission(name, opts): this`.
   - Add internal accessor `__transmissionIntents()`.
   - Surface records on `Scene` metadata only if needed; v1 review can read the
     assembly directly.

2. Validation
   - Validate unique transmission names.
   - Validate non-empty `sourceMate`, `drivenMates`, and `path`.
   - Validate finite `ratio` if provided.
   - Validate `kind` enum.

3. Review
   - Add `reviewMechanicalTransmission(arm)`.
   - Build maps of parts, mates, couplings.
   - For every coupling, require a transmission whose `sourceMate` matches the
     coupling source and whose `drivenMates` includes the coupled driven mate.
   - Check all named path parts exist.
   - Check path adjacency via existing mates: any consecutive parts must share a
     mate or both appear in a known transmission path with `kind-under-specified`
     warning.

4. Tooling
   - Include transmission diagnostics in `review_cad`.
   - Include `transmissions` in `inspect_assembly`.
   - Add `transmission` documentation to `list_api` and `src/skill/SKILL.md`.

5. Example Upgrade
   - Update `examples/robot-arm/compact-supported-arm.kcad.ts`:
     - add explicit servo horn / crank / link rod geometry for gripper fingers
     - add `arm.transmission(...)` for `grip -> left-curl/right-curl`
     - optionally add direct-horn transmissions for base/shoulder/elbow
   - Keep SO100 out of scope.

6. Tests
   - Unit test capture-time validation.
   - Review test: coupled mate without transmission fails.
   - Review test: named transmission path with missing part fails.
   - Review test: valid gripper link-rod transmission passes.
   - Integration test: compact robot arm has no missing transmission diagnostics.
   - Skill/doc sentinel: `transmission(...)` and
     `assembly.transmission.missing-for-coupled-mate` are documented.

## Explicit Non-Goals

- No full dynamics/torque simulation in this slice.
- No closed-loop numeric four-bar solver yet.
- No gear tooth contact simulation.
- No tendon routing collision/friction model.
- No automatic synthesis of transmission geometry.

## Acceptance Criteria

- A script with `arm.coupleMates('left-curl', { source: 'grip' })` and no
  matching `arm.transmission(...)` fails `review_cad`.
- `inspect_assembly` reports declared transmissions and any missing physical
  path facts.
- The compact robot arm example declares a real gripper transmission path and
  passes the new review gate.
- The agent-facing skill tells fresh agents that mate coupling alone is not a
  physical drive transmission.

## Why This Slice

This is the smallest next step that changes the loop from “pose metadata looks
valid” to “the agent must account for how motion and load get from actuator to
output.” It directly targets the current robot-arm weakness without requiring a
full physics engine.

## References

- Onshape Relations: https://cad.onshape.com/help/Content/Assembly/relations.htm
- Fusion motion links: https://help.autodesk.com/view/fusion360/ENU/?contextId=ASM-JOINTS
- SOLIDWORKS rack-and-pinion mates: https://help.solidworks.com/2018/english/solidworks/sldworks/t_Rack_and_Pinion_Mates_SWassy.htm
- FreeCAD Assembly workbench: https://reqrefusion.github.io/FreeCAD-Documentation-html/wiki/Assembly_Workbench.html
- Yale OpenHand Model T: https://www.eng.yale.edu/grablab/openhand/model_t.html
- Aero Hand Open: https://docs.tetheria.org/docs/intro/
- HRI hand open-source underactuated hand: https://www.sciencedirect.com/science/article/pii/S2468067220300092
- BiDexHand: https://github.com/wengmister/BiDexHand
