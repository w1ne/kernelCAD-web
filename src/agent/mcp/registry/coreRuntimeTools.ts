// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateScriptTool } from '../tools/evaluateScript';
import { diffScriptsTool } from '../tools/diffScripts';
import { diffGeometryTool } from '../tools/diffGeometry';
import { setParamValueTool } from '../tools/setParamValue';
import type { ToolRegistryEntry } from './types';

const evaluateScriptToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'evaluate_script',
    description:
      'Use this when you need to run a script and check it compiles. ' +
      'Run a kernelCAD .kcad.ts script and report pass/fail + feature count + diagnostics. ' +
      'When the scene is assembly-built (assembly().part(...) → .model()/.solvedModel()), ' +
      'also returns a parts summary { count, names } AND runs the mechanism-truth gate by ' +
      'default: the `mechanism` field reports real/broken/unverified and a broken mechanism ' +
      '(self-collision, fastened drift, dof-mismatch) makes ok:false with the failures in ' +
      'diagnostics. Pass { skipMechanismCheck: true } to opt out. ' +
      'Pass either { file: "<path>" } or { code: "<inline source>" }. ' +
      'Set { dryRun: true } for fast validation while iterating: transpile + capture + ' +
      'capture-light checks WITHOUT OCCT lowering, DFM gates, or meshing — milliseconds ' +
      'instead of seconds (100x+ on boolean/fillet-heavy scripts). A dry run catches script ' +
      'throws, capture-time API misuse, and assembly validity-gate failures, but NOT ' +
      'lowering failures or dfmSpec diagnostics; it leaves the active session untouched, ' +
      'so finish with a full (non-dry) evaluate_script before using session-dependent tools.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
        code: { type: 'string', description: 'Inline kernelCAD script source.' },
        dryRun: {
          type: 'boolean',
          description:
            'Fast validation only: skip OCCT lowering, DFM gates, and meshing. ' +
            'Does not set or clear the active session.',
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
      'diff as one "(root)" pseudo-part. Use after editing a script to verify exactly what ' +
      'changed physically before re-rendering. Read-only — never touches the active session.',
    inputSchema: {
      type: 'object',
      properties: {
        baseFile: { type: 'string', description: 'Baseline script — path to a .kcad.ts file.' },
        baseCode: { type: 'string', description: 'Baseline script — inline source.' },
        file: { type: 'string', description: 'Revised script — path to a .kcad.ts file.' },
        code: { type: 'string', description: 'Revised script — inline source.' },
      },
    },
  },
  handler: input => diffScriptsTool(input as Parameters<typeof diffScriptsTool>[0]),
};

const diffGeometryToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'diff_geometry',
    description:
      'Use this when you need to know WHAT MATERIAL changed between two versions of a model, not ' +
      "just how much. The deeper sibling of diff_scripts: a volume delta alone is ambiguous (a boss " +
      'that grew and a pocket that deepened report the same magnitude, and a part that only moved ' +
      'reports zero), so this tool answers it with geometry instead of pixels. Baseline is ' +
      '{ baseFile } or { baseCode }; the revised side is either another script ({ file } or ' +
      '{ code }) or the SAME script re-lowered with { params } overrides — a bag of declared ' +
      'param() name -> new value, which is the one-script form a parameter sweep actually asks for. ' +
      'Bodies pair by name and fall back to declaration-order positional pairing; anything left ' +
      'over is listed in `unmatched` and raises diff.body.unmatched. Per matched body it returns ' +
      'addedMm3 = volume(revised - base), removedMm3 = volume(base - revised), commonMm3 = ' +
      'volume(base ∩ revised) from OCCT booleans, exact bbox with min/max/extent deltas, face / ' +
      'edge / hole count deltas (hole counts reuse the cylindrical-hole detector), maxDeviationMm ' +
      '(two-sided discrete Hausdorff distance between the two surfaces), and a `verdict` — ' +
      'identical | moved | resized | topology-changed, precedence topology-changed > resized > ' +
      'moved > identical. Branch on the verdict; cite the numbers. Optional { render: true } also ' +
      'writes an added-green / removed-red overlay PNG through the render_preview pipeline and ' +
      'fails open (the numeric diff is still returned) when that pipeline is unavailable. ' +
      'Read-only — never touches the active session.',
    inputSchema: {
      type: 'object',
      properties: {
        baseFile: { type: 'string', description: 'Baseline script — path to a .kcad.ts file.' },
        baseCode: { type: 'string', description: 'Baseline script — inline source.' },
        file: { type: 'string', description: 'Revised script — path to a .kcad.ts file. Mutually exclusive with params.' },
        code: { type: 'string', description: 'Revised script — inline source. Mutually exclusive with params.' },
        params: {
          type: 'object',
          additionalProperties: true,
          description:
            'Param-override mode: re-lower the BASELINE with these declared param() values changed ' +
            "(e.g. { plateThickness: 8 }). Mutually exclusive with file/code. A name the baseline " +
            'does not declare fails with the declared-param list in the message.',
        },
        render: {
          type: 'boolean',
          description:
            'Also render an overlay PNG — added material green, removed material red — via the ' +
            'render_preview pipeline. Off by default; the numeric table is the agent-facing evidence.',
        },
        out_dir: {
          type: 'string',
          description: 'Directory for the overlay PNG, its STL inputs, and the generated overlay script. Default: a temp dir.',
        },
      },
    },
  },
  handler: input => diffGeometryTool(input as Parameters<typeof diffGeometryTool>[0]),
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
        new_value: { description: 'The new default value — number for numeric params, string for expressions.' },
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

/** Appended at the TAIL of the public registry. kernelCAD-server consumes the
 *  historical registry order as part of the public contract, so a new tool
 *  goes on the end rather than next to its family — every existing index
 *  stays put. */
export const coreRuntimeDiffGeometryToolEntries: ToolRegistryEntry[] = [diffGeometryToolEntry];

// Aggregate export for tests and family-level audits. Production composition
// intentionally splits these entries to preserve the historical public order.
export const coreRuntimeToolEntries: ToolRegistryEntry[] = [
  ...coreRuntimePreludeToolEntries,
  ...coreRuntimeParameterToolEntries,
  ...coreRuntimeDiffGeometryToolEntries,
];
