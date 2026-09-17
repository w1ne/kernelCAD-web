// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const EXPORT_CODES = {
  // Export (19)
  'export.feature-not-found': {
    hintTemplate:
      'The feature_id passed to export_model was not found. Use list_features to see available IDs.',
    nextAction: { kind: 'call-introspection-tool', tool: 'list_features' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'An export tool received a feature_id that does not match any feature in the recompute graph.',
  },
  'export.no-shape': {
    hintTemplate: 'The script did not return a shape. End the script with `return <shape>`.',
    nextAction: { kind: 'add-return' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'The script produced no shape to export (no return value and no captured records).',
  },
  'export.options-format-mismatch': {
    hintTemplate:
      'options.format must equal the top-level format. Set options.format to the same value, or omit options.',
    nextAction: { kind: 'fix-arg', field: 'options.format' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'The per-format options payload carried a discriminator that did not match the top-level format.',
  },
  'export.dxf.non-planar': {
    hintTemplate:
      'DXF export requires planar input. Call list_faces to pick a planar face, or return a Region via Shape.flattenPattern().',
    nextAction: { kind: 'call-introspection-tool', tool: 'list_faces' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'A DXF export was attempted on non-planar geometry (3D solid without a single planar face source, or a multi-body Scene).',
  },
  'export.3mf.not-watertight': {
    hintTemplate:
      'The exported mesh has non-manifold edges (likely a self-intersecting cone tessellation or an open shell). Re-mesh via Manifold, raise OCCT mesh deflection, or re-author the offending surface via nurbsSurfaceLowerer; see the K1 mesher gap.',
    nextAction: { kind: 'rewrite-feature', guidance: 'remesh via Manifold, raise mesh deflection, or re-author the offending surface via nurbsSurfaceLowerer' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'A 3MF export was attempted on a mesh that failed the half-edge watertight check.',
  },
  'export.mesh.not-watertight': {
    hintTemplate:
      'The exported STL has open edges after the heal pass. Re-author the junctions at the reported crack-cluster locations with >=0.1 mm of overlap or offset instead of exact tangency/coincidence, then re-export. Use --no-verify only to inspect the broken mesh, never to ship it.',
    nextAction: { kind: 'rewrite-feature', guidance: 'add >=0.1 mm overlap/offset at the reported crack locations instead of exact tangency' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'A finished STL export failed the post-export edge-adjacency watertight verify (open or over-shared mesh edges remain).',
  },
  'export.part.not-found': {
    hintTemplate:
      'The requested part name is not in the solved assembly. Pick one of the valid names listed in the message, or call list_part_stats to enumerate parts.',
    nextAction: { kind: 'fix-arg', field: 'part' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'A per-part export referenced a part name that does not exist in the solved assembly scene.',
  },
  'export.glb.draco-glass-conflict': {
    hintTemplate:
      'Draco compression is reserved but not yet implemented. Pass options.draco: false or omit; the encoder ships in a follow-up slice. (The name nods at the most common collision: Draco encoders typically strip the `KHR_materials_transmission` extension on glass parts, which would silently break the GLB.)',
    nextAction: { kind: 'fix-arg', field: 'options.draco' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'A GLB export requested Draco compression; the encoder is not yet implemented (reserved for a follow-up slice to avoid silently stripping KHR_materials_transmission on glass parts).',
  },
  'export.urdf.cylindrical-lossy': {
    hintTemplate:
      'URDF lacks a 2-DOF cylindrical joint; the mate was emitted as a single revolute and the prismatic DOF was dropped. Switch to format: \'sdf-gazebo\' if both DOFs are needed.',
    nextAction: { kind: 'fix-arg', field: 'format' },
    defaultSeverity: 'warn',
    group: 'export',
    description: 'A cylindrical mate was lowered to a URDF revolute joint; the prismatic DOF was lost.',
  },
  'export.urdf.pin-slot-lossy': {
    hintTemplate:
      'URDF lacks a pin-slot joint; the mate was emitted as a single revolute and the slot translation DOF was dropped. Switch to format: \'sdf-gazebo\' or restructure the mate graph if both DOFs are needed.',
    nextAction: { kind: 'fix-arg', field: 'format' },
    defaultSeverity: 'warn',
    group: 'export',
    description: 'A pin_slot mate was lowered to a URDF revolute joint; the slot translation DOF was lost.',
  },
  'export.urdf.ball-decomposed': {
    hintTemplate:
      'URDF lacks a spherical joint; the mate was decomposed into three chained revolute joints with two synthesised dummy intermediate links. Switch to format: \'sdf-gazebo\' for a native ball joint.',
    nextAction: { kind: 'fix-arg', field: 'format' },
    defaultSeverity: 'warn',
    group: 'export',
    description: 'A ball mate was decomposed into a 3-revolute chain for URDF compatibility.',
  },
  'export.urdf.closed-loop': {
    hintTemplate:
      'URDF requires a tree topology (one parent per link); the assembly has a closed kinematic loop. Switch to export_model with format: \'sdf-gazebo\' which supports closed loops natively, or restructure the mate graph to a spanning tree.',
    nextAction: { kind: 'fix-arg', field: 'format' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'A URDF export was attempted on an assembly whose mate graph contains a closed kinematic loop.',
  },
  'export.urdf.inertia-density-declared': {
    hintTemplate:
      'Link inertia uses the default density 1000 kg/m^3 (water). Downstream dynamics simulations will be off by ~8x for steel or ~2.7x for aluminum unless you pass density on arm.part(name, shape, { density }).',
    nextAction: { kind: 'fix-arg', field: 'density' },
    defaultSeverity: 'warn',
    group: 'export',
    description: 'A link in the exported URDF inherited the default 1000 kg/m^3 density; the user did not declare a per-part value.',
  },
  'export.srdf.acm-sparse-sampling': {
    hintTemplate:
      'ACM derivation used fewer than 4 samples per mate; interior collisions may be missed. Increase options.samplesPerMate on export_model({ format: \'srdf\', ... }) or set combinatorial: true.',
    nextAction: { kind: 'fix-arg', field: 'samplesPerMate' },
    defaultSeverity: 'warn',
    group: 'export',
    description: 'SRDF ACM auto-derivation ran with sparser sampling than the recommended threshold.',
  },
  'export.srdf.planning-group-missing': {
    hintTemplate:
      'SRDF export requires at least one arm.planningGroup(...) declaration before export. Declare arm.planningGroup(name, { chain: { baseLink, tipLink } }) or arm.planningGroup(name, { joints: [...] }) in your .kcad.ts.',
    nextAction: { kind: 'add-return' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'SRDF export attempted on an assembly with no planning-group declarations.',
  },
  'export.sdf-gazebo.cylindrical-lossy': {
    hintTemplate:
      'SDFormat lacks a 2-DOF cylindrical joint; the mate was emitted as a revolute and the prismatic DOF was dropped. Restructure the mate graph if both DOFs are required.',
    nextAction: { kind: 'rewrite-feature', guidance: 'split cylindrical into a revolute + prismatic chain' },
    defaultSeverity: 'warn',
    group: 'export',
    description: 'A cylindrical mate was lowered to an SDFormat revolute joint; the prismatic DOF was lost.',
  },
  'export.sdf-gazebo.pin-slot-lossy': {
    hintTemplate:
      'SDFormat lacks a pin-slot joint; the mate was emitted as a revolute and the slot translation DOF was dropped. Restructure the mate graph if both DOFs are required.',
    nextAction: { kind: 'rewrite-feature', guidance: 'split pin_slot into a revolute + prismatic chain' },
    defaultSeverity: 'warn',
    group: 'export',
    description: 'A pin_slot mate was lowered to an SDFormat revolute joint; the slot translation DOF was lost.',
  },
  'export.sdf-gazebo.invalid-version': {
    hintTemplate:
      'SDFormat version attribute must be a recognised SDF spec version. The emitter writes <sdf version="1.10"> by default — the newest spec current simulator LTS releases parse; do not override.',
    nextAction: { kind: 'fix-arg', field: 'version' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'The SDFormat emitter detected an unsupported version attribute.',
  },
  'export.sdf-gazebo.dangling-link-ref': {
    hintTemplate:
      'A <joint> in the emitted SDF references a <link> that is not declared in the model. Verify every part on the mate-graph is also declared via arm.part(...).',
    nextAction: { kind: 'call-introspection-tool', tool: 'inspect_robot' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'SDFormat structural validation detected a joint referencing an undeclared link.',
  },
  'export.sdf-gazebo.pose-unsolved': {
    hintTemplate:
      'The mate graph could not be solved to per-link world poses, so every <link> was emitted at the model origin. The simulator will see overlapping links at spawn and joints will snap or explode. Run solve_mates to diagnose the unsolvable mate, fix the connector geometry, then re-export.',
    nextAction: { kind: 'call-introspection-tool', tool: 'solve_mates' },
    defaultSeverity: 'warn',
    group: 'export',
    description: 'SDFormat export fell back to identity link poses because the mate graph did not solve.',
  },
  // Print loop (2) — Slice B
  'export.gcode.slicer-unavailable': {
    hintTemplate:
      'No slicer CLI was found. Set KERNELCAD_SLICER to a slicer binary path, or install OrcaSlicer (or PrusaSlicer) and ensure orca-slicer/prusa-slicer/PrusaSlicer is on PATH.',
    nextAction: { kind: 'check-cli-args' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'A gcode export was requested but no slicer CLI binary could be located (env var, or PATH lookup of orca-slicer/prusa-slicer/PrusaSlicer).',
  },
  'export.gcode.exceeds-bed': {
    hintTemplate:
      'The model bounding box exceeds the selected printer profile\'s bed size. Scale the part down, split it into printable sub-parts, or pass a printer profile with a larger bed.',
    nextAction: { kind: 'retry-with-smaller-param', param: 'scale', factor: 0.9 },
    defaultSeverity: 'error',
    group: 'export',
    description: 'A gcode export\'s bounding box (in any axis) exceeds the selected printer profile\'s bed size, checked before invoking the slicer.',
  },
  'export.usd.joint-unsupported': {
    hintTemplate:
      'The usd-isaac exporter only lowers fastened, revolute and prismatic mates to PhysicsFixedJoint / PhysicsRevoluteJoint / PhysicsPrismaticJoint. Restructure the mate graph to use one of those kinds, or export format: \'sdf-gazebo\' which supports the full mate vocabulary.',
    nextAction: { kind: 'fix-arg', field: 'format' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'A mate kind with no PhysicsJoint equivalent (planar/cylindrical/pin_slot/ball) was found while lowering to a usd-isaac physics stage.',
  },
  'export.usd.pose-unsolved': {
    hintTemplate:
      'The mate graph could not be solved to per-link world poses, so every link was placed at the stage origin and the simulator will spawn them overlapping. Run solve_mates to find the unsolvable mate, fix the connector geometry, then re-export.',
    nextAction: { kind: 'call-introspection-tool', tool: 'solve_mates' },
    defaultSeverity: 'warn',
    group: 'export',
    description: 'A usd-isaac export could not solve the mate graph to per-link poses; links were emitted at the stage origin.',
  },
  'export.usd.mass-missing': {
    hintTemplate:
      'A link\'s mass-properties computation returned a non-finite or non-positive mass; the rigid body prim cannot carry a physical mass. Pass density on arm.part(name, shape, { density }), or check the part\'s shape is closed and manifold.',
    nextAction: { kind: 'fix-arg', field: 'density' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'A link in a usd-isaac physics stage has a non-finite or non-positive mass and cannot be given a valid UsdPhysics MassAPI.',
  },
} as const satisfies Record<`export.${string}`, DiagnosticCodeSpec>;
