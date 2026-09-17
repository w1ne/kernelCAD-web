// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const ASSEMBLY_CODES = {
  // Assembly UX (2)
  'assembly.placement-ignored-by-mate-fk': {
    hintTemplate:
      "The part's `at:` placement was dropped because it is positioned by mate FK from its mate parent. Either remove the `at:` and let the mate decide the pose, or place the part's local frame so it sits at the intended pose with its mate connector at the origin (mate FK composes parent_world ∘ trans(parent_conn) ∘ joint ∘ trans(-child_conn)).",
    nextAction: { kind: 'fix-arg', field: 'at' },
    defaultSeverity: 'info',
    group: 'assembly',
    description: 'A part declared both an `at:` placement and a mate parent; the `at:` was overridden by mate FK.',
  },
  'assembly.mates-ignored-by-model-call': {
    hintTemplate:
      "The assembly declared mates but the script ended with arm.model() (which skips mate FK). Replace with arm.solvedModel({}) so the mate solver runs and parts pose correctly.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'replace arm.model() with arm.solvedModel({}) so the mate solver runs',
    },
    defaultSeverity: 'info',
    group: 'assembly',
    description: 'An assembly declared mates but the script returned arm.model() instead of arm.solvedModel({}), so mate FK never ran.',
  },
  // Assembly validator — v0.5 graph wiring (3)
  'assembly.part.floating': {
    hintTemplate:
      "Declare a joint or mate connecting this part to another part so the assembly graph is connected (arm.fixed/.revolute/.prismatic/.ball or arm.mate(...)).",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'declare an arm.fixed/.revolute/.prismatic/.ball joint or arm.mate(...) linking this part to another',
    },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'An assembly part has no joint or mate connecting it to any other part; the graph is disconnected.',
  },
  'assembly.part.orphan': {
    hintTemplate:
      "Add a joint or mate that links this sub-assembly to a part in the main mechanism so every component shares a single connected graph.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'add a joint linking this sub-assembly to a part in the main mechanism',
    },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'A part is part of a sub-assembly that is not transitively reachable from the main connected component.',
  },
  'assembly.interference.overlap': {
    hintTemplate:
      "Translate one part along its mating direction, or add a coupling part (washer / spacer / bracket) to clear the overlap. Use --ignore '<a>,<b>' on `kernelcad interference` if the contact is intentional.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'translate one part or insert a spacer/bracket to remove the BREP overlap',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'Two solid parts in the assembly share BREP volume (their bodies interfere).',
  },
  // Assembly validator — v0.6 mate-graph solver (5)
  'assembly.part.under-constrained': {
    hintTemplate:
      "Add a mate (arm.mate('...', 'partA.connector', 'partB.connector', '<type>')) or tighten an existing mate so every part has its 6 DOF removed.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'add or tighten a mate so every part has its 6 DOF removed',
    },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'The mate graph leaves residual degrees of freedom; the assembly is under-constrained.',
  },
  'assembly.mate.over-constrained': {
    hintTemplate:
      "Remove or relax one of the mates in the closed loop, or adjust a connector origin so the geometry agrees with the other mates.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'remove or relax a mate in the closed loop, or adjust a connector origin',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'At least one mate in a closed loop contradicts the others (loop-closure residual exceeds tolerance).',
  },
  'assembly.mate.type-mismatch': {
    hintTemplate:
      "The connector types on the two sides of this mate are incompatible. Verify each connector's `type` is one of {frame, axis, plane} and matches what the mate expects.",
    nextAction: { kind: 'fix-arg', field: 'connectorType' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A mate references two connectors whose types are incompatible with the requested mate kind.',
  },
  'assembly.mate.connector-not-found': {
    hintTemplate:
      "The connector ref 'partName.connectorName' did not resolve. Verify the part exists, the connector name matches a registered connector on that part, and the part name is not misspelled.",
    nextAction: { kind: 'fix-arg', field: 'connectorRef' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A mate references a connector that does not exist on the named part.',
  },
  'assembly.loop.unclosed': {
    hintTemplate:
      "A closed kinematic loop did not close within tolerance. Verify the connector origins on the loop's mates are geometrically consistent, or relax one mate so the loop has the DOF to close.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'verify loop geometry or relax one mate so the loop can close',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A closed kinematic loop in the mate graph failed to close within tolerance.',
  },
  'assembly.solver.did-not-converge': {
    hintTemplate:
      "Articulated closed loops are not yet supported by the v0.6 solver. Restrict closed loops to fastened-only mates, or split the mechanism into two open kinematic chains.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'restrict closed loops to fastened-only mates or split into open chains',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'The mate solver did not converge within the iteration cap.',
  },
  // Assembly validator — v0.6.2 envelope (5)
  'assembly.pose.out-of-limits': {
    hintTemplate:
      "A pose-envelope sample was outside the mate's declared limits. Either tighten the sample distribution, or widen limitsDeg/limitsMm on the mate to match the intended travel.",
    nextAction: { kind: 'fix-arg', field: 'limitsDeg' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A pose-envelope sample violates the mate-scalar limits declared on the mate.',
  },
  'assembly.pose-envelope.solve-failed': {
    hintTemplate:
      "The mate solver failed on a sampled pose inside the envelope. Verify the mate graph is consistent at that pose, then re-run; if it persists, simplify the mechanism or restrict limits to the converging range.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'simplify the mechanism or restrict mate limits to the converging range',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'The mate solver failed to converge for a sampled pose inside the declared envelope.',
  },
  'assembly.pose-envelope.interference': {
    hintTemplate:
      "Parts overlap somewhere inside the declared travel range. Either narrow mate limits to avoid the colliding poses, or revise part geometry / connector origins so the mechanism stays self-clear across the full envelope.",
    nextAction: { kind: 'fix-arg', field: 'limitsDeg' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'Two parts interfere at one or more sampled poses inside the declared envelope.',
  },
  'assembly.pose-envelope.clearance-violated': {
    hintTemplate:
      'A sampled pose falls below the declared inter-part clearance. Increase the geometric gap, reduce mate travel, or declare an intentional contact in dfmSpec.ignore.',
    nextAction: { kind: 'fix-arg', field: 'minClearance' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'Two non-exempt parts are closer than the declared DFM clearance at a sampled pose.',
  },
  'assembly.pose-envelope.clearance-unresolved': {
    hintTemplate:
      'Exact BREP clearance could not be measured at a sampled pose. Repair degenerate geometry or the lowering path and re-run; do not treat an unresolved pair as passing.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'repair the geometry or lowering path until exact BREP clearance can be measured',
    },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'Exact BREP clearance for a requested pose-envelope pair could not be resolved.',
  },
  'assembly.pose-envelope.connector-unresolved': {
    hintTemplate:
      "A tracked connector ref could not be resolved at a sampled pose — usually a topology-bound origin the envelope sampler does not yet support. Use { kind: 'vec3', value: [x, y, z] } for the connector origin.",
    nextAction: { kind: 'fix-arg', field: 'connectorRef' },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'A connector ref tracked by the pose envelope could not be resolved at a sampled pose.',
  },
  'assembly.gripper-aperture.connector-missing': {
    hintTemplate:
      "Gripper-aperture tracking expects two named connector refs on the gripper jaws. Pass { aRef: 'jaw_a.tip', bRef: 'jaw_b.tip' } (or whatever the connector names are) to gripperAperture.",
    nextAction: { kind: 'fix-arg', field: 'gripperAperture' },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'A gripper-aperture request named a connector that does not exist on either jaw.',
  },
  // Assembly validator — v0.6.2 limit-missing warning (1)
  'assembly.mate.limit-missing': {
    hintTemplate:
      "Declare limitsDeg:[min,max] (or limitsMm for prismatic) on this mate so the kernel can verify the mechanism does not self-collide across its declared range.",
    nextAction: { kind: 'fix-arg', field: 'limitsDeg' },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'An articulated mate (revolute/prismatic/cylindrical/pin_slot) has no declared limits; envelope review cannot verify its travel range.',
  },
  // Assembly validator — v0.7 kinematic-grounding gates (3)
  'assembly.mounting-hole.mismatch': {
    hintTemplate:
      "Make the hole features on the two bound faces compatible: same kind (clearance ↔ threaded), same nominal diameter, same depth. Use list_face_labels to inspect available holes. This is an authoring-time signal; the merge gate is mechanism.disconnect which fires under motion at validate-time.",
    nextAction: { kind: 'fix-arg', field: 'holeFeatures' },
    defaultSeverity: 'info',
    group: 'assembly',
    description: 'A fastened mate binds two faces whose hole features are incompatible (kind/diameter/depth mismatch).',
  },
  'assembly.joint-axis.unbound': {
    hintTemplate:
      "Move the connector origin onto a face/edge of its part, or change the connector axis so the line passes through the part's body. This is an authoring-time signal; the merge gate is mechanism.dof-mismatch which fires under motion at validate-time.",
    nextAction: { kind: 'fix-arg', field: 'connectorOrigin' },
    defaultSeverity: 'info',
    group: 'assembly',
    description: 'A joint axis (mate connector origin + direction) does not intersect the part body it claims to act on.',
  },
  'assembly.joint.child-modeled-in-place': {
    hintTemplate:
      "Pick ONE convention. Joint primitives (.revolute/.prismatic/.ball) use URDF semantics: `origin` is the parent->child frame offset and the child link must be modeled about its OWN origin. Either model the child about its origin and let the joint place it, or keep the placement and switch to connectors + arm.mate(...), which treats the origin as a pivot and preserves the modeled position at pose 0.",
    nextAction: { kind: 'fix-arg', field: 'origin' },
    defaultSeverity: 'warn',
    group: 'assembly',
    description:
      'A joint primitive drives a child part that the script also placed in assembly space, mixing the URDF (frame-offset) and mate (pivot) conventions — the child is displaced by the joint origin at every pose, including 0.',
  },
  'assembly.structure.unstructured-bodies': {
    hintTemplate:
      'Wrap the loose bodies in assembly().part(name, shape) so each part carries identity, per-part stats, and review handles; name every returned shape. This is an authoring-time signal — a multi-body model with no part names loses inspect --focus, list_part_stats, and Studio per-part validity.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'wrap each loose top-level body in a named assembly().part(name, shape)',
    },
    defaultSeverity: 'info',
    group: 'assembly',
    description: 'A multi-body model returns loose top-level bodies with no assembly().part(...) structure, so the parts carry no identity for inspection, stats, or per-part review.',
  },
  'assembly.joint.load-exceeded': {
    hintTemplate:
      "Increase maxLoad on this joint, reduce externalLoads, or split the load path with an additional joint.",
    nextAction: { kind: 'fix-arg', field: 'maxLoad' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A joint declared a maxLoad that is exceeded by the applied externalLoads.',
  },
  'assembly.joint.not-visible': {
    hintTemplate:
      "Widen the fork-plate gap (FORK_GAP_Y) versus the tongue thickness (TONGUE_Y), and/or extend the pivot pin (PIN_LEN) so the joint hardware is visible at typical viewing distance.",
    nextAction: { kind: 'fix-arg', field: 'jointGeometry' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: "A revolute joint's fork+tongue+pin geometry collapses into the visual envelope of one of the joined parts — the hinge mechanism reads as a solid block instead of a hinge (Gate 4 — joint visual exposure).",
  },
  'assembly.mate.not-physically-realized': {
    hintTemplate:
      "Use joint.clevis(...) (or the pattern equivalent for prismatic/cylindrical) to ensure a real pin or shaft constrains both parts and the through-hole is aligned through the bearing geometry. See kernelcad-kinematic SKILL.md \"Mechanism delivery\". This is an authoring-time signal; the merge gates are mechanism.disconnect and mechanism.interpenetration which fire under motion at validate-time.",
    nextAction: { kind: 'fix-arg', field: 'mateGeometry' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: "An articulated mate (revolute/prismatic) is declared but not realised by part geometry — no shared pin/shaft feature constrains both parts, or the pin escapes the hole at a sampled pose, or the bearing surfaces are not coplanar (Gate 6 — mate physical realization).",
  },
  'assembly.joint.static-hold.margin-low': {
    hintTemplate:
      "checkStaticHold's worst-pose required torque/force is within capacity but under the requested safety margin. Increase the actuator torque/force on this joint to the value named in error.message for the desired margin, or shorten the downstream link / reduce its mass.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'increase the actuator torque/force, or shorten/lighten the downstream link',
    },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'checkStaticHold found a revolute/prismatic joint whose worst-sampled-pose gravitational holding requirement is within the declared actuator capacity but below the requested minTorqueMarginPct floor.',
  },
  'assembly.joint.static-hold.exceeded': {
    hintTemplate:
      "checkStaticHold's worst-pose required torque/force exceeds the declared actuator capacity — the mechanism cannot hold its own weight at that pose. Increase the actuator torque/force to the value named in error.message, or shorten/lighten the downstream link.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'increase the actuator torque/force, or shorten/lighten the downstream link',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'checkStaticHold found a revolute/prismatic joint whose worst-sampled-pose gravitational holding requirement exceeds the declared actuator torque/force capacity.',
  },
  // Assembly validator — v0.7 Slice 1 workspace reachability (1)
  'assembly.workspace.unreachable': {
    hintTemplate:
      "Widen mate limits so the envelope reaches the target, revise the target, or run the envelope (validate:'error', posesGate:'envelope') if the gate hasn't been sampled yet.",
    nextAction: { kind: 'fix-arg', field: 'reachable' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A declared workspace target lies outside the sampled connector-workspace AABB (minus tolerance).',
  },
  // Assembly connector — topology resolution (1)
  'assembly.connector.topology-not-resolvable': {
    hintTemplate:
      "Use a face-center, face-normal, or edge-axis topology query whose target exists on the connector's parent shape; switch to { kind: 'vec3', value: [x, y, z] } if a topology binding isn't required.",
    nextAction: { kind: 'fix-arg', field: 'topology' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A connector topology query (face/edge/vertex) did not resolve against the connector parent shape.',
  },
  // Assembly mechanical-plausibility checks (6)
  'assembly.mechanical.part-disconnected': {
    hintTemplate:
      "Remove decorative/floating solids from this part, or add real bridge/bracket geometry so every solid in the part shares a physical load path.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'merge or bridge the floating solids in this part so it has one continuous load path',
    },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'A part contains multiple disconnected mesh components separated by more than the connectivity tolerance.',
  },
  'assembly.mechanical.connector-not-in-solid': {
    hintTemplate:
      "Move this connector onto the part's modeled bearing/bracket/knuckle, or add support geometry around that connector so the mate has a physical load path.",
    nextAction: { kind: 'fix-arg', field: 'connectorOrigin' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A mate connector origin lies outside its part\'s modeled material by more than the support tolerance.',
  },
  'assembly.mechanical.mate-contact-missing': {
    hintTemplate:
      "Add a bracket, flange, horn, or mounting face so the two fastened parts share a real contact patch near the mate, not just a connector point.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'add a bracket/flange/mounting face so the fastened parts share a real contact patch',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A fastened mate joins two parts whose modeled bodies do not share a usable contact area.',
  },
  'assembly.mechanical.fixed-contact-missing': {
    hintTemplate:
      "Move the fixed child into contact with its parent, or add a bracket, flange, stem, bridge, or mounting face so the fixed joint represents real attached geometry instead of an air gap.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'move or bridge fixed-joint parts so parent and child share a real contact patch',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A legacy assembly.fixed() joint joins two parts whose modeled bodies do not share a usable contact area.',
  },
  'assembly.mechanical.revolute-unsupported': {
    hintTemplate:
      "Add a hinge knuckle, bearing block, bracket, or shaft support so this connector lies on modeled material, not just near a bounding box.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'add a hinge knuckle / bearing block / bracket so the revolute connector lies on modeled material',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A revolute mate connector origin is outside the modeled support material of its part.',
  },
  'assembly.mechanical.revolute-contact-missing': {
    hintTemplate:
      "Add interleaved hinge knuckles, a clevis tab, spacer, or bearing shoulder so the two parts have modeled support faces near each other along the hinge axis.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'add interleaved hinge knuckles / clevis tab / bearing shoulder along the hinge axis',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A revolute mate leaves an axial gap between the two parts\' modeled bearing material.',
  },
  // Assembly transmission — orphan codes referenced in skill MD (2)
  'assembly.transmission.missing-for-coupled-mate': {
    hintTemplate:
      "Add arm.transmission(name, { sourceMate, drivenMates: [...], kind, path: [...] }) naming the horn/link/gear/belt/tendon parts that transfer motion between the coupled mates.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'declare arm.transmission(...) naming the physical drive path between the coupled mates',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A coupled mate pair lacks a declared arm.transmission(...) describing the physical drive path.',
  },
  'assembly.transmission.path-disconnected': {
    hintTemplate:
      "Add a horn/link/gear/belt/tendon part that physically touches both adjacent parts across the declared travel, or reorder the transmission path so consecutive parts form a continuous load path.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'add or reorder transmission-path parts so consecutive parts touch within tolerance',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A transmission path has a gap between consecutive parts that exceeds the contact tolerance at some sampled pose.',
  },
  // Assembly visual-review gating (3)
  'assembly.visual.review-check-failed': {
    hintTemplate:
      "Repair the specific failed visual checks, render screenshots again, and only accept when every required check passes.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'repair the failed visual checks and re-render before accepting',
    },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'A required visual-review check failed (or remained failed inside an accepted review).',
  },
  'assembly.visual.review-evidence-weak': {
    hintTemplate:
      "Record concrete screenshot evidence — name interfaces, load paths, seated hardware, dial legibility, casing layers — before accepting the attempt.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'record concrete screenshot evidence (interfaces, load paths, legibility) before accepting',
    },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'An accepted visual review has check findings without concrete evidence (interfaces, load paths, legibility, casing layers).',
  },
  'assembly.visual.review-incomplete': {
    hintTemplate:
      "Render or open screenshots, inspect them against the required visualReview.checks checklist, and record screenshotPath plus concrete findings before accepting.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'render screenshots and record screenshotPath + findings + checks before accepting',
    },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'An accepted visual review is missing screenshotPath, findings, or required check coverage.',
  },
} as const satisfies Record<`assembly.${string}`, DiagnosticCodeSpec>;
