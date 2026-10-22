// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateScriptTool } from '../tools/evaluateScript';
import { diffScriptsTool } from '../tools/diffScripts';
import { setParamValueTool } from '../tools/setParamValue';
import type { ToolRegistryEntry } from './types';

const evaluateScriptToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'evaluate_script',
    description:
      'Use this when you need to run a script and check it compiles. ' +
      'Full local builds return viewerUrl only when KERNELCAD_VIEWER_DIST explicitly supplies a separate viewer bundle; the link is reused on later full builds. Otherwise viewerError explains the missing viewer and geometry remains available. ' +
      'Hosted builds return viewerMode: hosted and viewerHint pointing to open_in_studio; they do not start a loopback viewer. ' +
      'Full evaluations return step evidence: build validity, volume and before/after local PNG paths in one shared iso frame. Snapshots require PW_CDP_URL for an existing browser; unavailable captures report an explicit error. ' +
      'Run a kernelCAD .kcad.ts script and report pass/fail + feature count + diagnostics + sceneSummary (BREP validity, volume in mm³, face count, bounding size in mm). ' +
      'When the scene is assembly-built (assembly().part(...) → .model()/.solvedModel()), ' +
      'also returns a parts summary { count, names } AND runs the mechanism-truth gate by ' +
      'default: the `mechanism` field reports real/broken/unverified and a broken mechanism ' +
      '(disconnected components / mechanism.orphan-part, self-collision, fastened drift, ' +
      'dof-mismatch) makes ok:false with the failures in diagnostics, as does a mate connector more than 6 mm outside its part bounding box (assembly.mechanical.connector-not-in-solid, the same error review_cad reports) — a mechanism (any mate or ' +
      'joint) needs every part linked by connectors + mates/joints ' +
      '(axis+revolute for shafts/hinges/gears; frame+fastened for rigid; or ' +
      'arm.revolute/.prismatic/.ball/.fixed). A plain multi-part assembly with no mates (base + lid, ' +
      'print layout) is independent bodies and passes. Pass { skipMechanismCheck: true } to opt out ' +
      '(e.g. a deliberately free part next to a mechanism). ' +
      'An animation or drive on a fastened joint (mechanism.motion-on-fixed-joint) is broken: animate a revolute/prismatic mate pose. ' +
      'For a model with moving joints or motion intent, `mechanismSummary.statement` is one plain line: ' +
      '"Motion checked: ..." names what ran; "Motion not checked: ..." is NOT a pass — never call that mechanism working. ' +
      'Every union() is checked too (no opt-out): union.disconnected (the union is several ' +
      'separate solids — a floating operand) and union.member-overlap (two operands that each ' +
      'carry their own .finish()/.material(), the same one, share > 1 mm³ — cut members to fit, e.g. a cross ' +
      'tube between rails is span minus two rail widths) make ok:false. ' +
      'Pass either { file: "<path>" } or { code: "<inline source>" }. ' +
      'Set { dryRun: true } for fast validation while iterating: transpile + capture + ' +
      'capture-light checks without building solids, DFM gates, or meshing — milliseconds ' +
      'instead of seconds (100x+ on boolean/fillet-heavy scripts). A dry run catches script ' +
      'throws, capture-time API misuse, and assembly validity-gate failures, but NOT ' +
      'lowering failures or dfmSpec diagnostics; it leaves the active session untouched, ' +
      'so finish with a full (non-dry) evaluate_script before using session-dependent tools. ' +
      'To show a measurement in the 3D viewer (e.g. hole spacing), declare it in the script with shape.dimension({ kind: "linear", from, to, label }); ' +
      'a full evaluate lists them as dimensions: [{ text, kind, source }], and a shared /p link with ?dims=1 forces them on.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
        code: { type: 'string', description: 'Inline kernelCAD script source.' },
        dryRun: {
          type: 'boolean',
          description:
            'Fast validation only: skip solid build, DFM gates, and meshing. ' +
            'Does not set or clear the active session.',
        },
        kernel: {
          type: 'string',
          enum: ['occt', 'smlib'],
          description:
            "Solid-modeling kernel. Default 'occt' (OpenCascade); opt-in 'smlib' uses guarded candidates with explicit OCCT fallback diagnostics.",
        },
        skipMechanismCheck: {
          type: 'boolean',
          description:
            'Opt out of the default mechanism-truth gate. By default a full ' +
            'evaluation of an assembly-built scene runs checkMechanismTruth and ' +
            'returns a `mechanism` verdict (real/broken/unverified); a broken ' +
            "mechanism makes ok:false. Set true to skip the sweep entirely (no " +
            '`mechanism` field, no cost). Ignored for dryRun and non-assembly scripts.',
        },
      },
    },
  },
  handler: input => evaluateScriptTool(input as Parameters<typeof evaluateScriptTool>[0]),
};

const diffScriptsToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'diff_scripts',
    description:
      'Use this when you need to see exactly what changed between two script versions. ' +
      'Structured geometric delta between two versions of a kernelCAD script — a baseline ' +
      '({ baseFile } or { baseCode }) and a revision ({ file } or { code }). Returns ' +
      'agent-readable JSON: per-part added/removed/renamed/changed (volume mm³ + exact bbox ' +
      "deltas, numbers matching inspect({ of: 'part-stats' })), total interference-volume delta with " +
      'per-pair detail, mate-graph changes (added/removed/changed mates incl. type, ' +
      'connectors, pose, limits), and param changes (value/min/max). Single-shape scripts ' +
      'diff as one "(root)" pseudo-part; a `return [a, b]` multi-body script diffs per body as "body[0]", "body[1]". ' +
      'An error that still leaves geometry (e.g. a skipped fillet) is listed under base/revised.errors beside the diff. ' +
      'Use after editing a script to verify exactly what changed physically before re-rendering. ' +
      "On a hosted server pass both versions inline: { baseCode: 'return box(10, 10, 10);', code: 'return box(10, 10, 12);' } " +
      '(base_code/old_code/before and revised_code/new_code/after are accepted as aliases). ' +
      'Read-only — never touches the active session.',
    inputSchema: {
      type: 'object',
      properties: {
        baseFile: { type: 'string', description: 'Baseline (before) script — path to a .kcad.ts file. Local servers only.' },
        baseCode: { type: 'string', description: 'Baseline (before) script — inline source. One of baseFile / baseCode is required.' },
        file: { type: 'string', description: 'Revised (after) script — path to a .kcad.ts file. Local servers only.' },
        code: { type: 'string', description: 'Revised (after) script — inline source. One of file / code is required.' },
      },
    },
  },
  handler: input => diffScriptsTool(input as Parameters<typeof diffScriptsTool>[0]),
};

const setParamToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'set_param',
    description: 'Use this when you need to edit a param() default value in a kernelCAD script. Returns the modified code as text plus diagnostics from re-evaluating the result. Caller persists the new code via standard file-write tools (this tool has no side effects).',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The .kcad.ts source code.' },
        param_name: { type: 'string', description: 'The string literal name of the param (first arg to param()).' },
        new_value: { type: ['number', 'boolean', 'string'], description: 'The new default value: number for numeric params, boolean for boolean params, or string for choice/string/color params (must be one of the declared choices for a choice param; a color param — one whose default is a hex literal — takes \'#rrggbb\', \'#rgb\' or a basic CSS colour name and is written back as \'#rrggbb\').' },
      },
      required: ['code', 'param_name', 'new_value'],
    },
  },
  handler: input => setParamValueTool(input as unknown as Parameters<typeof setParamValueTool>[0]),
};

export const coreRuntimePreludeToolEntries: ToolRegistryEntry[] = [
  evaluateScriptToolEntry,
  diffScriptsToolEntry,
];

export const coreRuntimeParameterToolEntries: ToolRegistryEntry[] = [setParamToolEntry];

// Aggregate export for tests and family-level audits. Production composition
// intentionally splits these entries to preserve the historical public order.
export const coreRuntimeToolEntries: ToolRegistryEntry[] = [
  ...coreRuntimePreludeToolEntries,
  ...coreRuntimeParameterToolEntries,
];
