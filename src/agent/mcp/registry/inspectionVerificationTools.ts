// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { inspectTool } from '../tools/inspect';
import { queryTool } from '../tools/query';
import { verifyTool } from '../tools/verify';
import { whyDidThisFailTool } from '../tools/whyDidThisFail';
import type { ToolRegistryEntry } from './types';

const inspectToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'inspect',
    description:
      'Use this when you need to read facts about a model. One reader, selected by `of`:\n' +
      "- 'assembly' — physical assembly inventory (parts, bboxes, connectors, mates, disconnected solids).\n" +
      "- 'robot' — URDF/SDFormat export preview (links, joints, planning groups, end-effectors, issues).\n" +
      "- 'step' — inspect an imported STEP file.\n" +
      "- 'shape' — volume / surfaceArea / bbox for one feature ({ feature_id? }).\n" +
      "- 'features' — features captured by the script (kind, id, params, transforms, suppression).\n" +
      "- 'assemblies' — assembly intent (assemblies, parts, connectors, joints).\n" +
      "- 'topology' — canonical face names + edge count for a feature ({ feature_id? }).\n" +
      "- 'edges' — edges of a shape with optional EdgeQuery ({ feature_id?, query? }); returns @kc[...] refs.\n" +
      "- 'face-edges' — boundary edges of a named canonical face ({ feature_id?, face_name }).\n" +
      "- 'faces' — faces of a shape with optional FaceQuery ({ feature_id?, query? }); returns @kc[...] refs.\n" +
      "- 'face-labels' — user-applied labels visible in the script.\n" +
      "- 'mates' — mates captured by the script.\n" +
      "- 'constraints' — sketch constraints captured by the script.\n" +
      "- 'part-stats' — bundled parts-catalog statistics.\n" +
      "- 'bend-table' — sheet-metal bend table for a flattened pattern.\n" +
      "- 'params' — declared model parameters.\n" +
      "- 'part-categories' — top-level part-catalog categories available in the bundled (and configured remote) catalog.\n" +
      "- 'part-families' — part families within a category ({ category? }); count + exemplar ids per family.\n" +
      'All params except `of` are subject-specific and forwarded verbatim. Most subjects accept { file | code }.',
    inputSchema: {
      type: 'object',
      properties: {
        of: {
          type: 'string',
          enum: ['assembly', 'robot', 'step', 'shape', 'features', 'assemblies', 'topology', 'edges', 'face-edges', 'faces', 'face-labels', 'mates', 'constraints', 'part-stats', 'bend-table', 'params', 'part-categories', 'part-families'],
          description: 'Which facts to read.',
        },
        file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
        code: { type: 'string', description: 'Inline kernelCAD script source.' },
        assembly: { type: 'string', description: "of:'assembly'|'robot' — assembly name; defaults to the first captured assembly." },
        feature_id: { type: 'string', description: "of:'shape'|'topology'|'edges'|'faces'|'face-edges'|'face-labels' — FeatureId; defaults to the last returned shape." },
        face_name: { type: 'string', enum: ['top', 'bottom', 'left', 'right', 'front', 'back'], description: "of:'face-edges' — canonical face name (required for that subject)." },
        query: { type: 'object', description: "of:'edges'|'faces' — optional EdgeQuery/FaceQuery filter." },
        category: { type: 'string', description: "of:'part-families' — optional top-level category to filter families by." },
      },
      required: ['of'],
    },
  },
  handler: input => inspectTool(input as unknown as Parameters<typeof inspectTool>[0]),
};

const verifyToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'verify',
    description:
      'Use this when you need to check a design against a rule set. One verifier, selected by `check`:\n' +
      "- 'assembly' — mate-aware assembly validator on the active session (run evaluate_script first).\n" +
      "- 'urdf' — structural validity of a .urdf file ({ urdf_path }).\n" +
      "- 'dfm' — print-readiness gates declared by dfmSpec() ({ file | code }).\n" +
      "- 'dfm-preflight' — sheet-metal flat pattern vs a job-shop's ordering rules ({ vendor, material, thicknessIn|thicknessMm, ... }).\n" +
      "- 'swept-collision' — sweep declared joint range(s) and report colliding poses.\n" +
      "- 'reachable' — inverse-kinematics reachability for an end-effector ({ tip_link, target_position, ... }).\n" +
      "- 'mounting-holes' — fastened mates expose matching hole diameters on both sides.\n" +
      "- 'load-capacity' — closed-form Euler-Bernoulli beam stress / safety-factor check ({ loads, materials, ... }).\n" +
      'All params except `check` are check-specific and forwarded verbatim; each check fails closed on its own missing required params.',
    inputSchema: {
      type: 'object',
      properties: {
        check: {
          type: 'string',
          enum: ['assembly', 'urdf', 'dfm', 'dfm-preflight', 'swept-collision', 'reachable', 'mounting-holes', 'load-capacity'],
          description: 'Which verification to run.',
        },
        file: { type: 'string', description: 'Path to a .kcad.ts script (assembly/dfm/dfm-preflight/swept-collision/reachable/mounting-holes/load-capacity).' },
        code: { type: 'string', description: 'Inline kernelCAD script source (same checks as `file`).' },
        assembly: { type: 'string', description: 'Assembly name; defaults to the first captured assembly.' },
        urdf_path: { type: 'string', description: "check:'urdf' — path to the .urdf file." },
        dxf: { type: 'string', description: "check:'dfm-preflight' — path to a DXF file." },
        featureId: { type: 'string', description: "check:'dfm-preflight' — FeatureId to scope to." },
        vendor: { type: 'string', description: "check:'dfm-preflight' — vendor SKU (required for that check)." },
        material: { type: 'string', description: "check:'dfm-preflight' — material SKU (required for that check)." },
        thicknessIn: { type: 'number', description: "check:'dfm-preflight' — material thickness in inches." },
        thicknessMm: { type: 'number', description: "check:'dfm-preflight' — material thickness in millimeters." },
        service: { type: 'string', enum: ['laser', 'cnc-router', 'waterjet', 'bending'], description: "check:'dfm-preflight' — service." },
        refreshCatalog: { type: 'boolean', description: "check:'dfm-preflight' — force vendor catalog refresh." },
        joint: { type: 'string', description: "check:'swept-collision' — joint to sweep; omit to sweep every declared joint." },
        range: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: "check:'swept-collision' — [lower, upper, step] in joint-native units." },
        collision_tolerance_mm3: { type: 'number', description: "check:'swept-collision' — BREP intersection volume tolerance (mm^3)." },
        tip_link: { type: 'string', description: "check:'reachable' — end-effector part name (required for that check)." },
        target_position: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: "check:'reachable' — target [x, y, z] mm (world frame)." },
        target_orientation: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: "check:'reachable' — target XYZ Euler angles in radians." },
        position_tolerance_mm: { type: 'number', description: "check:'reachable' — position tolerance in mm." },
        orientation_tolerance_rad: { type: 'number', description: "check:'reachable' — orientation tolerance in radians." },
        prefer_solver: { type: 'string', enum: ['analytical', 'numeric', 'auto'], description: "check:'reachable' — force the IK path ('auto' default)." },
        max_iterations: { type: 'number', description: "check:'reachable' — numeric-path iteration cap." },
        seed: { type: 'object', description: "check:'reachable' — numeric IK seed pose (joint name -> deg/mm)." },
        loads: { type: 'object', description: "check:'load-capacity' — partName -> { force?: [Fx,Fy,Fz] N, torque?: [Tx,Ty,Tz] N*m }." },
        materials: { type: 'object', description: "check:'load-capacity' — partName -> material declaration." },
        mode: { type: 'string', enum: ['stub', 'beam'], description: "check:'load-capacity' — 'beam' (default) or 'stub'." },
        safety_factor_threshold: { type: 'number', description: "check:'load-capacity' — pass/fail safety-factor floor (default 1.5)." },
      },
      required: ['check'],
    },
  },
  handler: input => verifyTool(input as unknown as Parameters<typeof verifyTool>[0]),
};

const whyDidThisFailToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'why_did_this_fail',
    description: "Use this when you need to trace why a feature failed. Walk the upstream chain of a failing feature. Returns the diagnostics of the requested feature plus the diagnostics of every upstream feature in topological order (the requested feature is the last entry). Per-code hints are inline on every diagnostic — call lookup_diagnostics for the full catalogue. Pass { file?, code?, feature_id? }.",
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string' },
        code: { type: 'string' },
        feature_id: { type: 'string' },
      },
    },
  },
  handler: input => whyDidThisFailTool(input as Parameters<typeof whyDidThisFailTool>[0]),
};

const queryToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'query',
    description:
      "Use this when you need to resolve or inspect topology against a script's lowered geometry. " +
      "Selected by `mode` (default 'evaluate'):\n" +
      "- 'evaluate' — inspect a Query (@kc[...] ref, @kcq[...] DSL, or { ast }); returns matched entities. Pass expect:'unique' to assert exactly-one.\n" +
      "- 'resolve' — resolve a single @kc[...] / @kcq[...] ref to one entity ({ ref }).\n" +
      "- 'lineage' — walk the HistoryMap for a named face ref ({ feature_id, ref }).\n" +
      'All params except `mode` are forwarded verbatim.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['evaluate', 'resolve', 'lineage'], description: "Resolution mode (default 'evaluate')." },
        file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
        code: { type: 'string', description: 'Inline kernelCAD script source.' },
        query: { description: "mode:'evaluate' — Query input: @kc[...] / @kcq[...] string or { ast } object." },
        ref: { type: 'string', description: "mode:'resolve'|'lineage' — topology ref string." },
        expect: { type: 'string', enum: ['any', 'unique'], description: "mode:'evaluate' — 'unique' asserts exactly-one." },
        feature_id: { type: 'string', description: 'Optional FeatureId; defaults to the last lowered shape (use "auto" for lineage).' },
      },
    },
  },
  handler: input => queryTool(input as unknown as Parameters<typeof queryTool>[0]),
};

export const inspectionVerificationPreludeToolEntries: ToolRegistryEntry[] = [
  inspectToolEntry,
  verifyToolEntry,
  whyDidThisFailToolEntry,
];

export const inspectionVerificationQueryToolEntries: ToolRegistryEntry[] = [queryToolEntry];

// Aggregate export for tests and family-level audits. Production composition
// intentionally splits these entries to preserve the historical public order.
export const inspectionVerificationToolEntries: ToolRegistryEntry[] = [
  ...inspectionVerificationPreludeToolEntries,
  ...inspectionVerificationQueryToolEntries,
];
